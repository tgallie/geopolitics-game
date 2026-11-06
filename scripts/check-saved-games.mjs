import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);
// keep integration checks repeatable without paid commentary requests
process.env.AI_COMMENTARY_ENABLED = "false";
const { getAuth } = await import("../src/lib/auth.ts");
const { getDatabase, getMongoClient } = await import("../src/lib/db/mongodb.ts");
const { handleGameRequest, handleShareRequest, handleWatchRequest } = await import("../src/lib/game/saved-games.ts");
const base = process.env.BETTER_AUTH_URL;
const emails = [0, 1].map(() => `saved-game-check-${randomUUID()}@example.invalid`);
let database;

try {
  const auth = await getAuth();
  database = await getDatabase();
  const cookies = [];
  for (const email of emails) {
    const response = await auth.handler(new Request(`${base}/api/auth/sign-up/email`, {
      method: "POST", headers: { origin: base, "content-type": "application/json", "x-forwarded-for": "192.0.2.42" },
      body: JSON.stringify({ email, name: "Temporary saved-game check", password: randomBytes(24).toString("hex") }),
    }));
    assert.ok(response.ok, "Test registration must succeed");
    cookies.push(response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; "));
  }
  function request(cookie, id, body, origin = base) {
    return handleGameRequest(new Request(`${base}/api/games${id ? `/${id}` : ""}`, {
      method: body ? "POST" : "GET",
      headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), id);
  }
  assert.equal((await request(null)).status, 401, "Anonymous list must fail");
  assert.equal((await request(null, undefined, { selectedCountryId: "ZA" })).status, 401, "Anonymous create must fail");
  assert.equal((await request(cookies[0], undefined, { selectedCountryId: "ZA" }, "https://untrusted.example")).status, 403, "Untrusted origin must fail");
  assert.equal((await request(cookies[0], undefined, { selectedCountryId: "FAKE" })).status, 400, "Unknown country must fail");
  const created = await request(cookies[0], undefined, { selectedCountryId: "ZA", ownerUserId: "forged", state: { revision: 999 } });
  assert.equal(created.status, 201, "Creation must succeed");
  const game = await created.json();
  const owner = await database.collection("user").findOne({ email: emails[0] });
  assert.equal(game.ownerUserId, owner._id.toString(), "Owner must come from session");
  assert.equal(game.revision, 0, "Browser cannot set starting revision");
  assert.equal(game.territories.length, 10, "Server must choose ten countries");
  assert.equal((await request(null, game.id)).status, 401, "Anonymous resume must fail");
  assert.equal((await request(cookies[1], game.id)).status, 404, "Other account cannot resume");
  assert.equal((await request(cookies[1], game.id, { revision: 0, action: { type: "skip" } })).status, 404, "Other account cannot move");
  assert.deepEqual(await (await request(cookies[1])).json(), [], "Other account cannot list games");
  assert.deepEqual(await (await request(cookies[0], game.id)).json(), game, "Resume must preserve complete state");
  const commandFor = (state) => state.players.find((p) => p.id === state.currentPlayerId).kind === "npc"
    ? { revision: state.revision, npc: true } : { revision: state.revision, action: { type: "skip" } };
  const raced = await Promise.all([request(cookies[0], game.id, commandFor(game)), request(cookies[0], game.id, commandFor(game))]);
  assert.deepEqual(raced.map((response) => response.status).sort(), [200, 409], "Only one simultaneous update may succeed");
  let state = await (await request(cookies[0], game.id)).json();
  assert.equal(state.revision, 1, "Concurrent update must save exactly one move");
  assert.equal((await request(cookies[0], game.id, commandFor(game))).status, 409, "Stale move must fail");
  for (let i = 0; state.players.find((p) => p.id === state.currentPlayerId).kind === "npc" && i < 200; i++) {
    const next = await request(cookies[0], game.id, commandFor(state));
    assert.ok(next.ok, "NPC decision must save");
    state = await next.json();
  }
  assert.equal(state.players.find((p) => p.id === state.currentPlayerId).kind, "human", "NPC turns must reach player");
  assert.equal((await request(cookies[0], game.id, { revision: state.revision, npc: true })).status, 400, "Cannot use NPC endpoint for human turn");
  assert.equal((await request(cookies[0], game.id, { revision: state.revision, action: { type: "invented" } })).status, 400, "Unknown action must fail");
  assert.equal((await request(cookies[0], game.id, { revision: state.revision, action: { type: "reinforce", countryId: "ZA", amount: -5 } })).status, 400, "Negative troops must fail");
  assert.deepEqual(await (await request(cookies[0], game.id)).json(), state, "Rejected actions must not change saved state");
  assert.equal((await request(cookies[0], undefined, { selectedCountryId: "GB" })).status, 201, "Second game must succeed");
  assert.equal((await (await request(cookies[0])).json()).length, 2, "Both games must remain available");
  const share = (cookie, method = "POST", origin = base) => handleShareRequest(new Request(`${base}/api/games/${game.id}/share`, {
    method, headers: { origin, ...(cookie ? { cookie } : {}) },
  }), game.id);
  const watch = (token, method = "GET") => handleWatchRequest(new Request(`${base}/api/watch/${token}`, { method }), token);
  assert.equal((await share(null)).status, 401, "Anonymous sharing must fail");
  assert.equal((await share(cookies[1])).status, 404, "Another player cannot share this game");
  assert.equal((await share(cookies[0], "POST", "https://untrusted.example")).status, 403, "Cross-origin sharing must fail");
  assert.equal((await (await share(cookies[0], "GET")).json()).token, null, "Sharing starts disabled");
  const shared = await share(cookies[0]);
  assert.equal(shared.status, 200, "Owner can enable sharing");
  const { token } = await shared.json();
  assert.ok(!!token, "Link must have a token");
  assert.equal((await (await share(cookies[0])).json()).token, token, "Repeated sharing preserves the link");
  const publicResponse = await watch(token);
  assert.equal(publicResponse.status, 200, "Visitor can watch without login");
  const publicState = await publicResponse.json();
  assert.ok(!("ownerUserId" in publicState), "Public state must not expose account ID");
  assert.equal(publicState.revision, state.revision, "Spectator sees latest moves");
  assert.equal(publicState.territories.length, 10, "Spectator sees all countries");
  assert.equal((await watch(token, "POST")).status, 405, "Spectator cannot make moves");
  assert.equal((await watch(game.id)).status, 404, "Game ID is not a share token");
  assert.equal((await share(cookies[1], "DELETE")).status, 404, "Another player cannot revoke sharing");
  assert.equal((await share(cookies[0], "DELETE")).status, 200, "Owner can revoke sharing");
  assert.equal((await watch(token)).status, 404, "Revoked link must stop working");
  const newToken = (await (await share(cookies[0])).json()).token;
  assert.notEqual(newToken, token, "Re-enabling sharing rotates the link");
  assert.equal((await watch(token)).status, 404, "Old link stays revoked");
  console.log("Spectator checks passed: public reads, private account data, owner-only sharing, read-only access and revocation.");
  console.log("Saved-game checks passed: persistence, multiple games, sessions, ownership, origin protection, invalid actions, NPC turns and concurrent updates.");
} catch (error) {
  console.error(error?.code === "ERR_ASSERTION" ? `Saved-game check failed: ${error.message.split("\n")[0]}` : "Saved-game check failed. Check local configuration and database access.");
  process.exitCode = 1;
} finally {
  try {
    if (database) {
      for (const email of emails) {
        const user = await database.collection("user").findOne({ email });
        if (!user) continue;
        await database.collection("games").deleteMany({ ownerUserId: user._id.toString() });
        await database.collection("session").deleteMany({ userId: user._id });
        await database.collection("account").deleteMany({ userId: user._id });
        await database.collection("user").deleteOne({ _id: user._id, email });
      }
      console.log("Temporary accounts and games removed.");
    }
  } finally { await (await getMongoClient()).close(); }
}
