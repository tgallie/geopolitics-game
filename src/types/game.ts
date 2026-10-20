/** Population is a snapshot: ongoing games must not change when source data updates. */
export interface Country {
  id: string;
  name: string;
  population: number;
  populationYear: number;
  populationSource: string;
  baseSoldierValue: number;
}

export interface Player {
  id: string;
  name: string;
  kind: "human" | "npc";
}

export interface Territory {
  country: Country;
  ownerId: string;
  soldiers: number;
}

export interface Battle {
  attackingCountryId: string;
  defendingCountryId: string;
  phaseNumber: number;
}

/** Serializable state, ready for a later NoSQL persistence layer. */
export interface GameState {
  id: string;
  ownerUserId: string;
  players: Player[];
  territories: Territory[];
  turnOrder: string[];
  currentPlayerId: string;
  round: number;
  playersWhoActedThisRound: string[];
  phase: "reinforcement" | "action" | "combat" | "conquest" | "finished";
  reinforcementsRemaining: number;
  attackUsedThisTurn: boolean;
  battle: Battle | null;
  winnerId: string | null;
  revision: number;
}
