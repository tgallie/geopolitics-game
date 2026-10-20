export const COUNTRIES_PER_GAME = 10;

function integerAtLeast(value: number, minimum: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${label} must be a safe integer of at least ${minimum}.`);
  }
}

export function soldiersForPopulation(population: number): number {
  integerAtLeast(population, 0, "Population");
  const limits = [5, 10, 25, 50, 75, 100, 125, 150];
  const index = limits.findIndex((millions) => population <= millions * 1_000_000);
  return index === -1 ? 9 : index + 1;
}

/** Use the country's original population-based value, not its surviving army. */
export function conquestReward(baseSoldierValue: number): number {
  integerAtLeast(baseSoldierValue, 1, "Base soldier value");
  if (baseSoldierValue > 9) throw new RangeError("Base soldier value cannot exceed 9.");
  return Math.max(2, Math.floor(baseSoldierValue / 2));
}

export function reinforcementsForTurn(round: number, countriesOwned: number): number {
  integerAtLeast(round, 1, "Round");
  integerAtLeast(countriesOwned, 0, "Countries owned");
  if (countriesOwned > COUNTRIES_PER_GAME) throw new RangeError("A game has only 10 countries.");
  return round === 1 ? 0 : countriesOwned * 2;
}

export function combatDiceCount(attackerSoldiers: number, defenderSoldiers: number): number {
  integerAtLeast(attackerSoldiers, 1, "Attacker soldiers");
  integerAtLeast(defenderSoldiers, 1, "Defender soldiers");
  return Math.min(attackerSoldiers - 1, defenderSoldiers);
}

/** Resolve one simultaneous phase. Pair by index; do not sort the dice. */
export function resolveCombatPhase(
  attackerSoldiers: number,
  defenderSoldiers: number,
  attackerRolls: readonly number[],
  defenderRolls: readonly number[],
) {
  const count = combatDiceCount(attackerSoldiers, defenderSoldiers);
  if (count === 0) throw new RangeError("Attacking requires at least two soldiers.");
  if (attackerRolls.length !== count || defenderRolls.length !== count) {
    throw new RangeError(`Each side must roll exactly ${count} dice.`);
  }
  for (const roll of [...attackerRolls, ...defenderRolls]) {
    integerAtLeast(roll, 1, "Die roll");
    if (roll > 6) throw new RangeError("A die roll cannot exceed 6.");
  }
  let attackerLosses = 0;
  let defenderLosses = 0;
  const pairs = attackerRolls.map((attack, index) => {
    const defend = defenderRolls[index];
    if (attack < defend) attackerLosses++;
    if (attack > defend) defenderLosses++;
    return { attack, defend, winner: attack === defend ? "tie" : attack > defend ? "attacker" : "defender" };
  });
  const attackerRemaining = attackerSoldiers - attackerLosses;
  const defenderRemaining = defenderSoldiers - defenderLosses;
  return {
    pairs, attackerLosses, defenderLosses, attackerRemaining, defenderRemaining,
    conquered: defenderRemaining === 0,
    canContinue: attackerRemaining >= 2 && defenderRemaining > 0,
  };
}

/** Arithmetic only: the later turn handler must also check ownership and phase. */
export function transferSoldiers(source: number, destination: number, amount: number) {
  integerAtLeast(source, 1, "Source soldiers");
  integerAtLeast(destination, 1, "Destination soldiers");
  integerAtLeast(amount, 1, "Transfer amount");
  if (amount >= source) throw new RangeError("Leave at least one soldier in the source country.");
  integerAtLeast(destination + amount, 1, "Resulting destination soldiers");
  return { source: source - amount, destination: destination + amount };
}
