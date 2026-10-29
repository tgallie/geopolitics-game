import type { GameAction, GameState, Territory } from "../../types/game.ts";
import { conquestReward } from "../game/rules.ts";
import { GameEngine } from "../game/game-engine.ts";

export interface NpcDecision {
  action: GameAction;
  explanation: string;
}

function ownedCountries(state: GameState): Territory[] {
  return state.territories.filter((country) => country.ownerId === state.currentPlayerId);
}

function strongest(countries: Territory[]): Territory {
  return [...countries].sort((a, b) => b.soldiers - a.soldiers || a.country.id.localeCompare(b.country.id))[0];
}

function bestAttack(state: GameState) {
  const owned = ownedCountries(state);
  const enemies = state.territories.filter((country) => country.ownerId !== state.currentPlayerId);
  const choices = owned.flatMap((from) => enemies.map((to) => ({
    from, to,
    // prefer a good army advantage, then the country that gives more bonus soldiers
    score: (from.soldiers - 1) / to.soldiers + conquestReward(to.country.baseSoldierValue) * 0.04,
  })));
  return choices.sort((a, b) => b.score - a.score || a.to.country.id.localeCompare(b.to.country.id))[0];
}

export function chooseNpcAction(state: GameState): NpcDecision {
  const player = state.players.find((item) => item.id === state.currentPlayerId);
  if (player?.kind !== "npc" || state.phase === "finished") {
    throw new Error("NPC strategy can only run on an active NPC turn.");
  }

  const owned = ownedCountries(state);
  if (owned.length === 0) throw new Error("An eliminated NPC cannot take a turn.");
  const main = strongest(owned);

  if (state.phase === "reinforcement") {
    return {
      action: { type: "reinforce", countryId: main.country.id, amount: state.reinforcementsRemaining },
      explanation: `I place all ${state.reinforcementsRemaining} new soldiers in ${main.country.name}, my strongest army, to improve my next attack.`,
    };
  }

  if (state.phase === "conquest") {
    if (!state.battle) throw new Error("Conquest needs a battle.");
    const from = state.territories.find((country) => country.country.id === state.battle!.attackingCountryId)!;
    const amount = Math.max(1, Math.floor((from.soldiers - 1) / 2));
    return {
      action: { type: "occupy", amount },
      explanation: `I move ${amount} soldiers into the captured country and keep ${from.soldiers - amount} in ${from.country.name}.`,
    };
  }

  if (state.phase === "combat") {
    if (!state.battle) throw new Error("Combat needs a battle.");
    const from = state.territories.find((country) => country.country.id === state.battle!.attackingCountryId)!;
    const to = state.territories.find((country) => country.country.id === state.battle!.defendingCountryId)!;
    if (from.soldiers - 1 >= to.soldiers) {
      return { action: { type: "roll" }, explanation: `I keep attacking ${to.country.name}; ${from.soldiers - 1} soldiers can fight its ${to.soldiers} defenders.` };
    }
    return { action: { type: "skip" }, explanation: `I stop the attack on ${to.country.name}; my remaining army is too small for a sensible push.` };
  }

  if (state.phase !== "action") throw new Error("Unknown NPC phase.");
  const target = bestAttack(state);
  if (target && target.from.soldiers - 1 >= target.to.soldiers && target.score >= 1.05) {
    return {
      action: { type: "attack", fromId: target.from.country.id, toId: target.to.country.id },
      explanation: `I attack ${target.to.country.name} from ${target.from.country.name}: ${target.from.soldiers - 1} soldiers can fight ${target.to.soldiers} defenders, and victory earns ${conquestReward(target.to.country.baseSoldierValue)} bonus soldiers.`,
    };
  }

  // if two armies together can make a useful attack, bring them together first
  const donor = [...owned].filter((country) => country.country.id !== main.country.id && country.soldiers > 1)
    .sort((a, b) => b.soldiers - a.soldiers || a.country.id.localeCompare(b.country.id))[0];
  const weakestEnemy = [...state.territories].filter((country) => country.ownerId !== state.currentPlayerId)
    .sort((a, b) => a.soldiers - b.soldiers || a.country.id.localeCompare(b.country.id))[0];
  if (donor && weakestEnemy && main.soldiers + donor.soldiers - 2 >= weakestEnemy.soldiers) {
    const amount = donor.soldiers - 1;
    return {
      action: { type: "transfer", fromId: donor.country.id, toId: main.country.id, amount },
      explanation: `I move ${amount} soldiers from ${donor.country.name} to ${main.country.name}; together they have a better chance against ${weakestEnemy.country.name}.`,
    };
  }

  return {
    action: { type: "skip" },
    explanation: "I skip this attack. My armies need reinforcements before taking on the available defenders.",
  };
}

/** One visible NPC decision at a time. Fast-forward can shorten the delay between calls. */
export function advanceNpc(engine: GameEngine): GameState {
  const state = engine.snapshot;
  const decision = chooseNpcAction(state);
  return engine.dispatchNpc(state.revision, decision.action, decision.explanation);
}
