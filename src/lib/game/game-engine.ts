import type { Country, GameAction, GameEvent, GameState, Territory } from "../../types/game.ts";
import { BattleEngine, shuffled, type RandomSource } from "./battle-engine.ts";
import { conquestReward, COUNTRIES_PER_GAME, reinforcementsForTurn, soldiersForPopulation, transferSoldiers } from "./rules.ts";

export interface NewGame {
  id: string;
  ownerUserId: string;
  selectedCountryId: string;
  countries: readonly Country[];
}

function requireCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function positiveInteger(amount: number) {
  requireCondition(Number.isSafeInteger(amount) && amount > 0, "Choose a positive whole number of soldiers.");
}

export class GameEngine {
  // only this class can change the live state
  private state: GameState;
  private readonly battles: BattleEngine;

  private constructor(state: GameState, random: RandomSource) {
    this.state = state;
    this.battles = new BattleEngine(random);
  }

  static create(input: NewGame, random: RandomSource): GameEngine {
    requireCondition(input.id.trim() && input.ownerUserId.trim(), "A game and owner id are required.");
    requireCondition(input.countries.length >= COUNTRIES_PER_GAME, "At least ten countries are required.");
    requireCondition(new Set(input.countries.map((country) => country.id)).size === input.countries.length, "Country ids must be unique.");
    for (const country of input.countries) {
      requireCondition(country.id.trim() && country.name.trim(), "Every country needs an id and name.");
      requireCondition(Number.isSafeInteger(country.populationYear) && country.populationYear > 0 && country.populationSource.trim(), "Every country needs a population year and source.");
      requireCondition(country.baseSoldierValue === soldiersForPopulation(country.population), "Country soldier value does not match its population.");
    }
    const selected = input.countries.find((country) => country.id === input.selectedCountryId);
    requireCondition(selected, "Choose a country from the available list.");
    const opponents = shuffled(input.countries.filter((country) => country.id !== selected.id), random).slice(0, 9);
    const countries = [selected, ...opponents];
    const players = countries.map((country, i) => ({
      id: `player-${country.id}`,
      name: i === 0 ? "You" : `${country.name} commander`,
      kind: i === 0 ? "human" as const : "npc" as const,
    }));
    const order = shuffled(players.map((player) => player.id), random);
    const engine = new GameEngine({
      id: input.id, ownerUserId: input.ownerUserId, players,
      territories: countries.map((country, i) => ({ country: structuredClone(country), ownerId: players[i].id, soldiers: country.baseSoldierValue })),
      turnOrder: order, currentPlayerId: order[0], round: 1,
      playersWhoActedThisRound: [], phase: "action", reinforcementsRemaining: 0,
      attackUsedThisTurn: false, battle: null, winnerId: null, revision: 0, events: [],
    }, random);
    engine.record(engine.state, "setup", "Ten countries are ready. The turn order was randomly selected.");
    engine.record(engine.state, "turn", `${engine.playerName(engine.state)} takes the first turn.`);
    return engine;
  }

  get snapshot(): GameState {
    // give the screen a copy so it cannot accidentally change the game
    return structuredClone(this.state);
  }

  dispatch(playerId: string, expectedRevision: number, action: GameAction): GameState {
    requireCondition(this.state.phase !== "finished", "This game has finished.");
    requireCondition(playerId === this.state.currentPlayerId, "It is not this player's turn.");
    requireCondition(expectedRevision === this.state.revision, "The game changed. Refresh before making another move.");
    // work on a copy; a rejected move must leave the game untouched
    const draft = this.snapshot;
    this.apply(draft, action);
    draft.revision++;
    this.state = draft;
    return this.snapshot;
  }

  dispatchNpc(expectedRevision: number, action: GameAction, explanation: string): GameState {
    const current = this.state.players.find((player) => player.id === this.state.currentPlayerId);
    requireCondition(current?.kind === "npc" && this.state.phase !== "finished", "It is not an NPC turn.");
    requireCondition(expectedRevision === this.state.revision, "The game changed. Refresh before making another move.");
    requireCondition(explanation.trim().length > 0 && explanation.length <= 240, "NPC decisions need a short explanation.");
    const draft = this.snapshot;
    this.record(draft, "decision", `${current.name}: ${explanation}`);
    this.apply(draft, action);
    draft.revision++;
    this.state = draft;
    return this.snapshot;
  }

  private playerName(state: GameState) {
    return state.players.find((player) => player.id === state.currentPlayerId)!.name;
  }

  private record(state: GameState, kind: GameEvent["kind"], message: string, dice?: GameEvent["dice"], countries?: Pick<GameEvent, "fromCountryId" | "toCountryId">) {
    state.events.push({ sequence: state.events.length + 1, round: state.round, playerId: state.currentPlayerId, kind, message, ...(dice ? { dice } : {}), ...countries });
  }

  private territory(state: GameState, id: string): Territory {
    const territory = state.territories.find((item) => item.country.id === id);
    requireCondition(territory, "That country is not in this game.");
    return territory;
  }

  private owned(state: GameState, id: string): Territory {
    const territory = this.territory(state, id);
    requireCondition(territory.ownerId === state.currentPlayerId, "You do not control that country.");
    return territory;
  }

  private apply(state: GameState, action: GameAction) {
    switch (action.type) {
      case "reinforce": {
        requireCondition(state.phase === "reinforcement", "There are no reinforcements to allocate now.");
        positiveInteger(action.amount);
        const country = this.owned(state, action.countryId);
        requireCondition(action.amount <= state.reinforcementsRemaining, "You cannot allocate more soldiers than you received.");
        requireCondition(Number.isSafeInteger(country.soldiers + action.amount), "Soldier count is too large.");
        country.soldiers += action.amount;
        state.reinforcementsRemaining -= action.amount;
        this.record(state, "reinforce", `${country.country.name} receives ${action.amount} soldiers.`);
        if (state.reinforcementsRemaining === 0) state.phase = "action";
        return;
      }
      case "transfer": {
        requireCondition(state.phase === "action", "Transfers are only allowed outside combat, after reinforcements are allocated.");
        requireCondition(action.fromId !== action.toId, "Choose two different countries.");
        const from = this.owned(state, action.fromId);
        const to = this.owned(state, action.toId);
        const result = transferSoldiers(from.soldiers, to.soldiers, action.amount);
        from.soldiers = result.source;
        to.soldiers = result.destination;
        this.record(state, "transfer", `${from.country.name} sends ${action.amount} soldiers to ${to.country.name}.`);
        return;
      }
      case "attack": {
        requireCondition(state.phase === "action" && !state.attackUsedThisTurn, "Only one attack is allowed per turn.");
        const from = this.owned(state, action.fromId);
        const to = this.territory(state, action.toId);
        requireCondition(to.ownerId !== from.ownerId, "You cannot attack your own country.");
        requireCondition(from.soldiers >= 2, "At least two soldiers are needed to attack.");
        state.battle = { attackingCountryId: action.fromId, defendingCountryId: action.toId, phaseNumber: 0 };
        state.attackUsedThisTurn = true;
        state.phase = "combat";
        this.record(state, "attack", `${from.country.name} attacks ${to.country.name}.`, undefined, { fromCountryId: action.fromId, toCountryId: action.toId });
        return;
      }
      case "roll": {
        requireCondition(state.phase === "combat" && state.battle, "Start an attack before rolling dice.");
        const from = this.owned(state, state.battle.attackingCountryId);
        const to = this.territory(state, state.battle.defendingCountryId);
        const result = this.battles.roll(from.soldiers, to.soldiers);
        from.soldiers = result.attackerRemaining;
        to.soldiers = result.defenderRemaining;
        state.battle.phaseNumber++;
        this.record(state, "roll", `${from.country.name} loses ${result.attackerLosses}; ${to.country.name} loses ${result.defenderLosses}.`, result.pairs, { fromCountryId: from.country.id, toCountryId: to.country.id });
        if (result.conquered) {
          const previousOwner = to.ownerId;
          to.ownerId = state.currentPlayerId;
          const reward = conquestReward(to.country.baseSoldierValue);
          from.soldiers += reward;
          state.phase = "conquest";
          this.record(state, "conquest", `${to.country.name} is conquered. ${reward} bonus soldiers join ${from.country.name}; choose how many to move into the new country.`, undefined, { fromCountryId: from.country.id, toCountryId: to.country.id });
          if (!state.territories.some((country) => country.ownerId === previousOwner)) {
            this.record(state, "elimination", `${state.players.find((player) => player.id === previousOwner)!.name} has lost their last country.`);
          }
        } else if (!result.canContinue) {
          this.record(state, "skip", "The attack ends with one soldier remaining in the attacking country.");
          this.nextTurn(state);
        }
        return;
      }
      case "occupy": {
        requireCondition(state.phase === "conquest" && state.battle, "There is no conquered country awaiting soldiers.");
        positiveInteger(action.amount);
        const from = this.owned(state, state.battle.attackingCountryId);
        const to = this.owned(state, state.battle.defendingCountryId);
        requireCondition(action.amount < from.soldiers, "Leave at least one soldier in the attacking country.");
        from.soldiers -= action.amount;
        to.soldiers = action.amount;
        this.record(state, "transfer", `${action.amount} soldiers occupy ${to.country.name}.`);
        if (state.territories.every((country) => country.ownerId === state.currentPlayerId)) {
          state.winnerId = state.currentPlayerId;
          state.phase = "finished";
          state.battle = null;
          this.record(state, "victory", `${this.playerName(state)} controls all ten countries and wins!`);
        } else this.nextTurn(state);
        return;
      }
      case "skip":
        requireCondition(state.phase === "action" || state.phase === "combat", "Finish allocating or occupying before ending the turn.");
        this.record(state, "skip", state.phase === "combat" ? "The player stops the attack and ends their turn." : "The player skips their attack.");
        this.nextTurn(state);
        return;
      default:
        throw new Error("Unknown game action.");
    }
  }

  private nextTurn(state: GameState) {
    state.playersWhoActedThisRound.push(state.currentPlayerId);
    const active = new Set(state.territories.map((country) => country.ownerId));
    // eliminated players do not keep the round open or get another turn
    if ([...active].every((id) => state.playersWhoActedThisRound.includes(id))) {
      state.round++;
      state.playersWhoActedThisRound = [];
    }
    const index = state.turnOrder.indexOf(state.currentPlayerId);
    for (let offset = 1; offset <= state.turnOrder.length; offset++) {
      const candidate = state.turnOrder[(index + offset) % state.turnOrder.length];
      if (active.has(candidate)) { state.currentPlayerId = candidate; break; }
    }
    const owned = state.territories.filter((country) => country.ownerId === state.currentPlayerId).length;
    state.reinforcementsRemaining = reinforcementsForTurn(state.round, owned);
    state.phase = state.reinforcementsRemaining > 0 ? "reinforcement" : "action";
    state.battle = null;
    state.attackUsedThisTurn = false;
    this.record(state, "turn", `${this.playerName(state)} starts their turn with ${state.reinforcementsRemaining} reinforcements.`);
  }
}
