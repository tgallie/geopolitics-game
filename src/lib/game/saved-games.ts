import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { getAuth } from "../auth.ts";
import { getDatabase } from "../db/mongodb.ts";
import { countries } from "../../data/countries.ts";
import { GameEngine } from "./game-engine.ts";
import { advanceNpc } from "../ai/npc-strategy.ts";
import type { GameAction, GameState } from "../../types/game.ts";

interface SavedGame {
  _id: string;
  ownerUserId: string;
  countryName: string;
  createdAt: Date;
  updatedAt: Date;
  state: GameState;
  shareToken?: string;
}

let shareIndex: Promise<string> | undefined;

export async function handleShareRequest(request: Request, gameId: string) {
  try {
    rejectUnless(["GET", "POST", "DELETE"].includes(request.method), 405, "Method not allowed.");
    if (request.method !== "GET") rejectUnless(request.headers.get("origin") === new URL(process.env.BETTER_AUTH_URL!).origin, 403, "Open the game from its configured website address.");
    const session = await (await getAuth()).api.getSession({ headers: request.headers });
    rejectUnless(session, 401, "Log in to manage spectator links.");
    const games = (await getDatabase()).collection<SavedGame>("games");
    shareIndex ??= games.createIndex({ shareToken: 1 }, { unique: true, partialFilterExpression: { shareToken: { $type: "string" } } })
      .catch((error) => { shareIndex = undefined; throw error; });
    await shareIndex;
    const filter = { _id: gameId, ownerUserId: session.user.id };
    const saved = await games.findOne(filter);
    rejectUnless(saved, 404, "Saved game not found.");
    if (request.method === "DELETE") {
      await games.updateOne(filter, { $unset: { shareToken: "" } });
      return json({ token: null });
    }
    if (request.method === "POST") {
      // keep the same link until i explicitly stop sharing it
      await games.updateOne({ ...filter, shareToken: { $exists: false } }, { $set: { shareToken: randomUUID() } });
    }
    const current = await games.findOne(filter);
    return json({ token: current?.shareToken ?? null });
  } catch (error) {
    return error instanceof RequestError ? json({ message: error.message }, error.status) : json({ message: "Could not update spectator sharing. Try again shortly." }, 503);
  }
}

export async function handleWatchRequest(request: Request, token: string) {
  try {
    rejectUnless(request.method === "GET", 405, "Spectators can only watch games.");
    rejectUnless(/^[a-f0-9-]{36}$/.test(token), 404, "This spectator link is unavailable.");
    const saved = await (await getDatabase()).collection<SavedGame>("games").findOne({ shareToken: token });
    rejectUnless(saved, 404, "This spectator link is unavailable or sharing has stopped.");
    // never include account identifiers or credentials in the public view
    const { ownerUserId: _owner, ...state } = saved.state;
    void _owner;
    state.players = state.players.map((player) => player.kind === "human" ? { ...player, name: "Player" } : player);
    state.events = state.events.map((event) => ({ ...event, message: event.message.replace(/\bYou\b/g, "Player") }));
    return json(state);
  } catch (error) {
    return error instanceof RequestError ? json({ message: error.message }, error.status) : json({ message: "Could not refresh this game. Trying again shortly." }, 503);
  }
}

class RequestError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function rejectUnless(condition: unknown, status: number, message: string): asserts condition {
  if (!condition) throw new RequestError(status, message);
}

function record(value: unknown): Record<string, unknown> {
  rejectUnless(value && typeof value === "object" && !Array.isArray(value), 400, "Invalid request.");
  return value as Record<string, unknown>;
}

function parseAction(value: unknown): GameAction {
  const action = record(value);
  const id = (key: string) => {
    rejectUnless(typeof action[key] === "string" && action[key].length <= 80, 400, "Choose a valid country.");
    return action[key] as string;
  };
  const amount = () => {
    rejectUnless(Number.isSafeInteger(action.amount) && Number(action.amount) > 0, 400, "Choose a positive whole number of soldiers.");
    return action.amount as number;
  };
  switch (action.type) {
    case "skip": case "roll": return { type: action.type };
    case "occupy": return { type: "occupy", amount: amount() };
    case "reinforce": return { type: "reinforce", countryId: id("countryId"), amount: amount() };
    case "attack": return { type: "attack", fromId: id("fromId"), toId: id("toId") };
    case "transfer": return { type: "transfer", fromId: id("fromId"), toId: id("toId"), amount: amount() };
    default: throw new RequestError(400, "Unknown game action.");
  }
}

const randomFraction = () => randomInt(0, 2 ** 32) / 2 ** 32;
let indexes: Promise<string> | undefined;

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleGameRequest(request: Request, gameId?: string) {
  try {
    rejectUnless(request.method === "GET" || request.method === "POST", 405, "Method not allowed.");
    if (request.method === "POST") {
      rejectUnless(request.headers.get("origin") === new URL(process.env.BETTER_AUTH_URL!).origin, 403, "Open the game from its configured website address.");
      rejectUnless(request.headers.get("content-type")?.includes("application/json"), 415, "Use JSON for game actions.");
    }
    const auth = await getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    rejectUnless(session, 401, "Log in to start or resume your saved games.");
    const ownerUserId = session.user.id;
    const database = await getDatabase();
    const games = database.collection<SavedGame>("games");
    indexes ??= games.createIndex({ ownerUserId: 1, updatedAt: -1 }).catch((error) => { indexes = undefined; throw error; });
    await indexes;

    if (request.method === "GET" && !gameId) {
      const rows = await games.find({ ownerUserId }, { projection: { countryName: 1, updatedAt: 1, "state.round": 1, "state.phase": 1 } })
        .sort({ updatedAt: -1 }).limit(100).toArray();
      return json(rows.map((row) => ({ id: row._id, countryName: row.countryName, updatedAt: row.updatedAt.toISOString(), round: row.state.round, phase: row.state.phase })));
    }

    let body: Record<string, unknown> = {};
    if (request.method === "POST") {
      const text = await request.text();
      rejectUnless(text.length <= 4096, 413, "Game request is too large.");
      try { body = record(JSON.parse(text)); }
      catch { throw new RequestError(400, "Invalid game request."); }
    }
    if (!gameId) {
      rejectUnless(typeof body.selectedCountryId === "string" && countries.some((country) => country.id === body.selectedCountryId), 400, "Choose a country from the available list.");
      const state = GameEngine.create({ id: randomUUID(), ownerUserId, selectedCountryId: body.selectedCountryId, countries }, randomFraction).snapshot;
      const now = new Date();
      await games.insertOne({ _id: state.id, ownerUserId, countryName: countries.find((country) => country.id === body.selectedCountryId)!.name, createdAt: now, updatedAt: now, state });
      return json(state, 201);
    }

    rejectUnless(gameId.length <= 80, 404, "Saved game not found.");
    const saved = await games.findOne({ _id: gameId, ownerUserId });
    rejectUnless(saved, 404, "Saved game not found.");
    if (request.method === "GET") return json(saved.state);
    rejectUnless(Number.isSafeInteger(body.revision) && body.revision === saved.state.revision, 409, "This game changed in another tab. Reload it before continuing.");
    const current = saved.state.players.find((player) => player.id === saved.state.currentPlayerId);
    const npc = body.npc === true;
    rejectUnless(npc ? current?.kind === "npc" : current?.kind === "human", 400, "Wait for the correct player's turn.");
    const engine = GameEngine.restore(saved.state, randomFraction);
    let next: GameState;
    try {
      next = npc ? advanceNpc(engine) : engine.dispatch(current!.id, body.revision as number, parseAction(body.action));
    } catch (error) {
      throw new RequestError(400, error instanceof Error ? error.message : "That move is not allowed.");
    }
    // save only if no other tab has already changed this turn
    const result = await games.updateOne(
      { _id: gameId, ownerUserId, "state.revision": saved.state.revision },
      { $set: { state: next, updatedAt: new Date() } },
    );
    rejectUnless(result.modifiedCount === 1, 409, "This game changed in another tab. Reload it before continuing.");
    return json(next);
  } catch (error) {
    if (error instanceof RequestError) return json({ message: error.message }, error.status);
    return json({ message: "Could not reach saved games. Please try again shortly." }, 503);
  }
}
