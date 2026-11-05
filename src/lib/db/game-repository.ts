import "server-only";
import { randomUUID } from "node:crypto";
import type { Collection } from "mongodb";
import { getDatabase } from "./mongodb.ts";
import type { GameState } from "../../types/game.ts";

interface SavedGameDocument {
  _id: string;
  ownerUserId: string;
  countryName: string;
  createdAt: Date;
  updatedAt: Date;
  state: GameState;
  shareToken?: string;
}

export class GameRepository {
  private games: Collection<SavedGameDocument>;
  constructor(games: Collection<SavedGameDocument>) { this.games = games; }

  async listOwned(ownerUserId: string) {
    const rows = await this.games.find({ ownerUserId }, { projection: { countryName: 1, updatedAt: 1, "state.round": 1, "state.phase": 1 } })
      .sort({ updatedAt: -1 }).limit(100).toArray();
    return rows.map((row) => ({ id: row._id, countryName: row.countryName, updatedAt: row.updatedAt.toISOString(), round: row.state.round, phase: row.state.phase }));
  }

  findOwned(id: string, ownerUserId: string) { return this.games.findOne({ _id: id, ownerUserId }); }
  findShared(token: string) { return this.games.findOne({ shareToken: token }); }

  async create(state: GameState, countryName: string) {
    const now = new Date();
    await this.games.insertOne({ _id: state.id, ownerUserId: state.ownerUserId, countryName, createdAt: now, updatedAt: now, state });
  }

  async saveMove(state: GameState, ownerUserId: string, expectedRevision: number) {
    if (state.ownerUserId !== ownerUserId || state.revision !== expectedRevision + 1) throw new Error("Invalid saved-game revision or owner.");
    // a stale tab must never overwrite the move already saved by another tab
    const result = await this.games.updateOne({ _id: state.id, ownerUserId, "state.revision": expectedRevision },
      { $set: { state, updatedAt: new Date() } });
    return result.modifiedCount === 1;
  }

  async enableSharing(id: string, ownerUserId: string) {
    await this.games.updateOne({ _id: id, ownerUserId, shareToken: { $exists: false } }, { $set: { shareToken: randomUUID() } });
    return (await this.findOwned(id, ownerUserId))?.shareToken ?? null;
  }

  async revokeSharing(id: string, ownerUserId: string) {
    await this.games.updateOne({ _id: id, ownerUserId }, { $unset: { shareToken: "" } });
  }
}

let repository: Promise<GameRepository> | undefined;
export function getGameRepository() {
  repository ??= (async () => {
    const games = (await getDatabase()).collection<SavedGameDocument>("games");
    await Promise.all([
      games.createIndex({ ownerUserId: 1, updatedAt: -1 }),
      games.createIndex({ shareToken: 1 }, { unique: true, partialFilterExpression: { shareToken: { $type: "string" } } }),
    ]);
    return new GameRepository(games);
  })().catch((error) => { repository = undefined; throw error; });
  return repository;
}
