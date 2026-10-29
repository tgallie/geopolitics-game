import { test } from "node:test";
import assert from "node:assert/strict";
import { GameEngine } from "../src/lib/game/game-engine.ts";
import { BattleEngine } from "../src/lib/game/battle-engine.ts";

function fixture(population = 200_000_000, value = 9) {
  const countries = Array.from({ length: 12 }, (_, i) => ({
    id: `C${i}`, name: `Country ${i}`, population,
    populationYear: 2026, populationSource: "test fixture", baseSoldierValue: value,
  }));
  const rolls = [];
  const random = () => rolls.length ? rolls.shift() : 0.999;
  const input = { id: "game-1", ownerUserId: "user-1", selectedCountryId: "C0", countries };
  return { engine: GameEngine.create(input, random), rolls, input };
}

function move(engine, action) {
  const state = engine.snapshot;
  return engine.dispatch(state.currentPlayerId, state.revision, action);
}

function winPhase(engine, rolls) {
  const state = engine.snapshot;
  const from = state.territories.find(t => t.country.id === state.battle.attackingCountryId);
  const to = state.territories.find(t => t.country.id === state.battle.defendingCountryId);
  const count = Math.min(from.soldiers - 1, to.soldiers);
  rolls.push(...Array(count).fill(0.999), ...Array(count).fill(0));
  return move(engine, { type: "roll" });
}

function conquer(engine, rolls, target = "C1") {
  move(engine, { type: "attack", fromId: "C0", toId: target });
  while (engine.snapshot.phase === "combat") winPhase(engine, rolls);
  return move(engine, { type: "occupy", amount: 1 });
}

test("setup creates ten unique territories and independent snapshots", () => {
  const { engine, input } = fixture();
  const state = engine.snapshot;
  assert.equal(state.territories.length, 10);
  assert.equal(new Set(state.territories.map(t => t.country.id)).size, 10);
  assert.equal(state.players.filter(p => p.kind === "human").length, 1);
  assert.equal(state.currentPlayerId, state.players[0].id);
  state.territories[0].soldiers = 1000;
  input.countries[0].name = "changed";
  assert.equal(engine.snapshot.territories[0].soldiers, 9);
  assert.equal(engine.snapshot.territories[0].country.name, "Country 0");
});

test("invalid country pools and random sources are rejected", () => {
  const { input } = fixture();
  assert.throws(() => GameEngine.create({ ...input, countries: input.countries.slice(0, 9) }, () => 0));
  assert.throws(() => GameEngine.create({ ...input, selectedCountryId: "missing" }, () => 0));
  assert.throws(() => GameEngine.create({ ...input, countries: [...input.countries, input.countries[0]] }, () => 0));
  assert.throws(() => GameEngine.create(input, () => 1));
  input.countries[0].baseSoldierValue = 2;
  assert.throws(() => GameEngine.create(input, () => 0));
});

test("turn and revision guards reject moves without changing state", () => {
  const { engine } = fixture();
  const before = engine.snapshot;
  assert.throws(() => engine.dispatch("another-player", 0, { type: "skip" }));
  assert.throws(() => engine.dispatch(before.currentPlayerId, 7, { type: "skip" }));
  assert.throws(() => move(engine, { type: "not-a-command" }));
  assert.deepEqual(engine.snapshot, before);
});

test("no reinforcements in round one; round two requires allocation", () => {
  const { engine } = fixture();
  for (let i = 0; i < 10; i++) {
    assert.equal(engine.snapshot.reinforcementsRemaining, 0);
    move(engine, { type: "skip" });
  }
  assert.equal(engine.snapshot.round, 2);
  assert.equal(engine.snapshot.reinforcementsRemaining, 2);
  const before = engine.snapshot;
  assert.throws(() => move(engine, { type: "skip" }));
  assert.throws(() => move(engine, { type: "reinforce", countryId: "C1", amount: 1 }));
  assert.throws(() => move(engine, { type: "reinforce", countryId: "C0", amount: 3 }));
  assert.throws(() => move(engine, { type: "reinforce", countryId: "C0", amount: 0.5 }));
  assert.deepEqual(engine.snapshot, before);
  move(engine, { type: "reinforce", countryId: "C0", amount: 1 });
  assert.equal(engine.snapshot.phase, "reinforcement");
  move(engine, { type: "reinforce", countryId: "C0", amount: 1 });
  assert.equal(engine.snapshot.phase, "action");
  assert.equal(engine.snapshot.territories[0].soldiers, 11);
});

test("combat validates ownership, phase and minimum soldiers", () => {
  const { engine } = fixture();
  assert.throws(() => move(engine, { type: "attack", fromId: "C1", toId: "C2" }));
  assert.throws(() => move(engine, { type: "attack", fromId: "C0", toId: "C0" }));
  assert.throws(() => move(engine, { type: "roll" }));
  assert.throws(() => move(engine, { type: "transfer", fromId: "C0", toId: "C1", amount: 1 }));
  const weak = fixture(1_000_000, 1).engine;
  assert.throws(() => move(weak, { type: "attack", fromId: "C0", toId: "C1" }));
  move(engine, { type: "attack", fromId: "C0", toId: "C1" });
  assert.throws(() => move(engine, { type: "attack", fromId: "C0", toId: "C2" }));
  assert.throws(() => move(engine, { type: "transfer", fromId: "C0", toId: "C1", amount: 1 }));
  move(engine, { type: "skip" });
  assert.equal(engine.snapshot.currentPlayerId, "player-C1");
  assert.equal(engine.snapshot.battle, null);
});

test("ties cause no casualties and failed attacks retain both territories", () => {
  const { engine, rolls } = fixture(8_000_000, 2);
  move(engine, { type: "attack", fromId: "C0", toId: "C1" });
  move(engine, { type: "roll" });
  assert.equal(engine.snapshot.phase, "combat");
  assert.equal(engine.snapshot.territories[0].soldiers, 2);
  rolls.push(0, 0.999);
  move(engine, { type: "roll" });
  assert.equal(engine.snapshot.currentPlayerId, "player-C1");
  assert.equal(engine.snapshot.territories[0].soldiers, 1);
  assert.equal(engine.snapshot.territories[0].ownerId, "player-C0");
  assert.equal(engine.snapshot.territories[1].ownerId, "player-C1");
});

test("conquest gives original-value reward, requires occupation and skips eliminated player", () => {
  const { engine, rolls } = fixture();
  move(engine, { type: "attack", fromId: "C0", toId: "C1" });
  while (engine.snapshot.phase === "combat") winPhase(engine, rolls);
  assert.equal(engine.snapshot.territories[0].soldiers, 13);
  assert.equal(engine.snapshot.phase, "conquest");
  assert.throws(() => move(engine, { type: "skip" }));
  assert.throws(() => move(engine, { type: "occupy", amount: 0 }));
  assert.throws(() => move(engine, { type: "occupy", amount: 13 }));
  move(engine, { type: "occupy", amount: 2 });
  assert.equal(engine.snapshot.territories[0].soldiers, 11);
  assert.equal(engine.snapshot.territories[1].soldiers, 2);
  assert.equal(engine.snapshot.currentPlayerId, "player-C2");
  for (let i = 0; i < 8; i++) move(engine, { type: "skip" });
  assert.equal(engine.snapshot.round, 2);
  assert.equal(engine.snapshot.currentPlayerId, "player-C0");
  assert.equal(engine.snapshot.reinforcementsRemaining, 4);
});

test("owned-country transfers conserve armies and leave a soldier behind", () => {
  const { engine, rolls } = fixture();
  conquer(engine, rolls);
  for (let i = 0; i < 8; i++) move(engine, { type: "skip" });
  move(engine, { type: "reinforce", countryId: "C0", amount: 4 });
  const before = engine.snapshot.territories.reduce((sum, t) => sum + t.soldiers, 0);
  assert.throws(() => move(engine, { type: "transfer", fromId: "C0", toId: "C0", amount: 1 }));
  assert.throws(() => move(engine, { type: "transfer", fromId: "C1", toId: "C0", amount: 1 }));
  move(engine, { type: "transfer", fromId: "C0", toId: "C1", amount: 2 });
  assert.equal(engine.snapshot.territories[1].soldiers, 3);
  assert.equal(engine.snapshot.territories.reduce((sum, t) => sum + t.soldiers, 0), before);
});

test("a complete game ends only when all ten territories are occupied by the winner", () => {
  const { engine, rolls } = fixture();
  for (let i = 1; i <= 9; i++) {
    while (engine.snapshot.currentPlayerId !== "player-C0") {
      const state = engine.snapshot;
      if (state.phase === "reinforcement") {
        move(engine, { type: "reinforce", countryId: state.territories.find(t => t.ownerId === state.currentPlayerId).country.id, amount: state.reinforcementsRemaining });
      }
      move(engine, { type: "skip" });
    }
    if (engine.snapshot.phase === "reinforcement") move(engine, { type: "reinforce", countryId: "C0", amount: engine.snapshot.reinforcementsRemaining });
    conquer(engine, rolls, `C${i}`);
    assert.ok(engine.snapshot.territories.every(t => t.soldiers >= 1));
  }
  assert.equal(engine.snapshot.winnerId, "player-C0");
  assert.equal(engine.snapshot.phase, "finished");
  assert.equal(engine.snapshot.events.at(-1).kind, "victory");
  assert.throws(() => move(engine, { type: "skip" }));
  assert.deepEqual(engine.snapshot.events.map(e => e.sequence), Array.from({ length: engine.snapshot.events.length }, (_, i) => i + 1));
});

test("battle engine uses injected dice and rejects an invalid random source", () => {
  const values = [0, 0.5, 1 / 6, 1 / 3];
  const battle = new BattleEngine(() => values.shift());
  const result = battle.roll(10, 2);
  assert.deepEqual(result.pairs.map(p => [p.attack, p.defend]), [[1, 2], [4, 3]]);
  assert.equal(result.attackerLosses, 1);
  assert.equal(result.defenderLosses, 1);
  assert.throws(() => new BattleEngine(() => NaN).roll(2, 1));
});
