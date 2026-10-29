import { combatDiceCount, resolveCombatPhase } from "./rules.ts";

export type RandomSource = () => number;

export function randomIndex(size: number, random: RandomSource): number {
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("Random source must return a number from zero up to, but not including, one.");
  }
  return Math.floor(value * size);
}

// shuffle a copy so the original list stays as it was
export function shuffled<T>(items: readonly T[], random: RandomSource): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const other = randomIndex(i + 1, random);
    [result[i], result[other]] = [result[other], result[i]];
  }
  return result;
}

export class BattleEngine {
  private readonly random: RandomSource;

  constructor(random: RandomSource) {
    this.random = random;
  }

  roll(attacker: number, defender: number) {
    const count = combatDiceCount(attacker, defender);
    const attack = Array.from({ length: count }, () => randomIndex(6, this.random) + 1);
    const defend = Array.from({ length: count }, () => randomIndex(6, this.random) + 1);
    return resolveCombatPhase(attacker, defender, attack, defend);
  }
}
