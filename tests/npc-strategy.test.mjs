import { test } from "node:test";
import assert from "node:assert/strict";
import { chooseNpcAction, advanceNpc } from "../src/lib/ai/npc-strategy.ts";
import { GameEngine } from "../src/lib/game/game-engine.ts";

function country(id, soldiers) {
  const populations = { 1: 1_000_000, 2: 8_000_000, 3: 20_000_000, 9: 200_000_000 };
  return { country: { id, name: `Country ${id}`, population: populations[soldiers], populationYear: 2026, populationSource: "test", baseSoldierValue: soldiers }, ownerId: "npc-a", soldiers };
}

function state(phase, owned, enemies, extra = {}) {
  return {
    players: [{ id: "npc-a", name: "Alpha", kind: "npc" }, { id: "npc-b", name: "Beta", kind: "npc" }],
    currentPlayerId: "npc-a", phase, territories: [
      ...owned.map(([id, soldiers]) => country(id, soldiers)),
      ...enemies.map(([id, soldiers]) => ({ ...country(id, soldiers), ownerId: "npc-b" })),
    ],
    battle: null, reinforcementsRemaining: 0, ...extra,
  };
}

test("reinforcements go to the strongest army with an explanation", () => {
  const decision = chooseNpcAction(state("reinforcement", [["A", 2], ["B", 9]], [["C", 3]], { reinforcementsRemaining: 4 }));
  assert.deepEqual(decision.action, { type: "reinforce", countryId: "B", amount: 4 });
  assert.match(decision.explanation, /strongest army/);
});

test("NPC selects a favorable target rather than a random one", () => {
  const decision = chooseNpcAction(state("action", [["A", 9]], [["B", 9], ["C", 2]]));
  assert.deepEqual(decision.action, { type: "attack", fromId: "A", toId: "C" });
  assert.match(decision.explanation, /Country C/);
});

test("NPC brings armies together when that enables a useful future attack", () => {
  const decision = chooseNpcAction(state("action", [["A", 3], ["B", 3]], [["C", 4]]));
  assert.deepEqual(decision.action, { type: "transfer", fromId: "B", toId: "A", amount: 2 });
  const after = state("action", [["A", 5], ["B", 1]], [["C", 4]]);
  assert.equal(chooseNpcAction(after).action.type, "attack");
});

test("NPC skips when no army can be built strong enough", () => {
  const decision = chooseNpcAction(state("action", [["A", 2], ["B", 1]], [["C", 9]]));
  assert.equal(decision.action.type, "skip");
  assert.match(decision.explanation, /reinforcements/);
});

test("NPC rolls when strong, stops when weak, and occupies a conquest", () => {
  const battle = { attackingCountryId: "A", defendingCountryId: "C", phaseNumber: 1 };
  assert.equal(chooseNpcAction(state("combat", [["A", 9]], [["C", 2]], { battle })).action.type, "roll");
  assert.equal(chooseNpcAction(state("combat", [["A", 2]], [["C", 9]], { battle })).action.type, "skip");
  const occupation = state("conquest", [["A", 9], ["C", 1]], [["D", 2]], { battle });
  assert.deepEqual(chooseNpcAction(occupation).action, { type: "occupy", amount: 4 });
});

test("NPC decisions are added to the game history and advance one visible move", () => {
  const countries = Array.from({ length: 10 }, (_, i) => ({
    id: `C${i}`, name: `Country ${i}`, population: 8_000_000,
    populationYear: 2026, populationSource: "test", baseSoldierValue: 2,
  }));
  const engine = GameEngine.create({ id: "g", ownerUserId: "u", selectedCountryId: "C0", countries }, () => 0);
  assert.notEqual(engine.snapshot.currentPlayerId, "player-C0");
  const before = engine.snapshot;
  const after = advanceNpc(engine);
  assert.equal(after.revision, before.revision + 1);
  assert.equal(after.events.at(-3).kind, "decision");
  assert.match(after.events.at(-3).message, /reinforcements/);
  assert.equal(after.events.at(-2).kind, "skip");
  assert.equal(after.events.at(-1).kind, "turn");
  assert.throws(() => engine.dispatchNpc(before.revision, { type: "skip" }, "stale"));
  while (engine.snapshot.currentPlayerId !== "player-C0") advanceNpc(engine);
  assert.throws(() => advanceNpc(engine));
});

test("a rejected NPC action does not save a misleading decision", () => {
  const countries = Array.from({ length: 10 }, (_, i) => ({
    id: `C${i}`, name: `Country ${i}`, population: 8_000_000,
    populationYear: 2026, populationSource: "test", baseSoldierValue: 2,
  }));
  const engine = GameEngine.create({ id: "g", ownerUserId: "u", selectedCountryId: "C0", countries }, () => 0);
  const before = engine.snapshot;
  assert.throws(() => engine.dispatchNpc(before.revision, { type: "attack", fromId: "missing", toId: "C0" }, "I attack"));
  assert.deepEqual(engine.snapshot, before);
});
