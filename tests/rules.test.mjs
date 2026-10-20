import { test } from "node:test";
import assert from "node:assert/strict";
import { soldiersForPopulation, conquestReward, reinforcementsForTurn, combatDiceCount, resolveCombatPhase, transferSoldiers } from "../src/lib/game/rules.ts";

test("every population threshold includes its upper boundary", () => {
  [5, 10, 25, 50, 75, 100, 125, 150].forEach((millions, index) => {
    assert.equal(soldiersForPopulation(millions * 1_000_000), index + 1);
    assert.equal(soldiersForPopulation(millions * 1_000_000 + 1), index + 2);
  });
  assert.equal(soldiersForPopulation(800), 1);
  for (const value of [-1, NaN, Infinity, 1.5]) assert.throws(() => soldiersForPopulation(value));
});

test("conquest uses floor and a minimum reward of two", () => {
  assert.deepEqual(Array.from({ length: 9 }, (_, i) => conquestReward(i + 1)), [2, 2, 2, 2, 2, 3, 3, 4, 4]);
});

test("reinforcements begin in round two and eliminated players receive none", () => {
  assert.equal(reinforcementsForTurn(1, 3), 0);
  assert.equal(reinforcementsForTurn(2, 3), 6);
  assert.equal(reinforcementsForTurn(5, 0), 0);
});

test("dice count follows the brief, without the standard Risk cap", () => {
  assert.equal(combatDiceCount(10, 2), 2);
  assert.equal(combatDiceCount(3, 5), 2);
  assert.equal(combatDiceCount(2, 5), 1);
  assert.equal(combatDiceCount(10, 10), 9);
});

test("the brief's paired-dice example loses one soldier on each side", () => {
  const result = resolveCombatPhase(10, 2, [1, 4], [2, 3]);
  assert.equal(result.attackerRemaining, 9);
  assert.equal(result.defenderRemaining, 1);
  assert.equal(result.canContinue, true);
});

test("ties preserve soldiers and dice remain in their original order", () => {
  const tied = resolveCombatPhase(3, 2, [2, 6], [2, 6]);
  assert.equal(tied.attackerLosses + tied.defenderLosses, 0);
  const paired = resolveCombatPhase(3, 2, [6, 1], [2, 5]);
  assert.equal(paired.attackerLosses, 1);
  assert.equal(paired.defenderLosses, 1);
});

test("conquest and an exhausted attacker end combat", () => {
  assert.equal(resolveCombatPhase(2, 1, [6], [1]).conquered, true);
  const failed = resolveCombatPhase(2, 5, [1], [6]);
  assert.equal(failed.attackerRemaining, 1);
  assert.equal(failed.canContinue, false);
  assert.equal(failed.conquered, false);
});

test("invalid combat input is rejected", () => {
  assert.throws(() => resolveCombatPhase(1, 2, [], []));
  assert.throws(() => resolveCombatPhase(3, 2, [6], [1]));
  assert.throws(() => resolveCombatPhase(2, 1, [7], [1]));
  assert.throws(() => resolveCombatPhase(2, 1, [1.5], [1]));
});

test("transfers conserve soldiers and leave the source occupied", () => {
  assert.deepEqual(transferSoldiers(5, 2, 4), { source: 1, destination: 6 });
  for (const amount of [0, -1, 5, 6, 1.5]) assert.throws(() => transferSoldiers(5, 2, amount));
});
