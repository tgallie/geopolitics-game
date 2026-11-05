import { test } from "node:test";
import assert from "node:assert/strict";
import { addBattleCommentary } from "../src/lib/ai/battle-commentary.ts";

function fixture() {
  return { id: "private-game", ownerUserId: "private-owner", round: 2, phase: "combat",
    territories: [{ country: { id: "ZA", name: "South Africa" }, soldiers: 8 }, { country: { id: "GB", name: "United Kingdom" }, soldiers: 3 }],
    events: [{ sequence: 1, kind: "roll", message: "South Africa loses 1; United Kingdom loses 0.", fromCountryId: "ZA", toCountryId: "GB", dice: [{ attack: 1, defend: 6, winner: "defender" }] }],
  };
}

test("commentary uses only battle facts, persists provenance and cannot change rules", async () => {
  const state = fixture();
  const before = structuredClone(state);
  let requests = 0;
  await addBattleCommentary(state, 0, { apiKey: "test-key", fetcher: async (url, init) => {
    requests++;
    assert.equal(url, "https://api.openai.com/v1/responses");
    const body = JSON.parse(init.body);
    assert.equal(body.store, false);
    assert.ok(!body.input.includes("private-owner") && !body.input.includes("private-game"));
    assert.ok(body.input.includes("South Africa loses 1"));
    return Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "South Africa loses a soldier as the United Kingdom holds firm." }] }] });
  } });
  assert.equal(state.events[0].commentary.source, "ai");
  await addBattleCommentary(state, 0, { apiKey: "test-key", fetcher: async () => { throw new Error("Must not regenerate"); } });
  assert.equal(requests, 1);
  delete state.events[0].commentary;
  assert.deepEqual(state, before);
});

test("missing key makes no external request and uses labelled fallback", async () => {
  const state = fixture();
  await addBattleCommentary(state, 0, { apiKey: "", fetcher: async () => { assert.fail("No API call expected"); } });
  assert.equal(state.events[0].commentary.source, "fallback");
  assert.equal(state.events[0].commentary.reason, "not-configured");
});

test("provider failures, refusal, incomplete and oversized output preserve the move", async () => {
  const responses = [new Response("error", { status: 429 }), Response.json({ status: "incomplete" }),
    Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "refusal", refusal: "No" }] }] }),
    Response.json({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: "x".repeat(601) }] }] })];
  for (const response of responses) {
    const state = fixture();
    await addBattleCommentary(state, 0, { apiKey: "test-key", fetcher: async () => response });
    assert.equal(state.events[0].commentary.source, "fallback");
    assert.equal(state.territories[0].soldiers, 8);
  }
});

test("timeout aborts the provider request and falls back", async () => {
  const state = fixture();
  await addBattleCommentary(state, 0, { apiKey: "test-key", timeoutMs: 10, fetcher: async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new Error("Aborted")), { once: true });
  }) });
  assert.equal(state.events[0].commentary.reason, "unavailable");
});

test("reloading and non-battle actions never request commentary", async () => {
  const state = fixture();
  await addBattleCommentary(state, 1, { apiKey: "test-key", fetcher: async () => { assert.fail("No request expected"); } });
  assert.equal(state.events[0].commentary, undefined);
  state.events[0].kind = "reinforce";
  await addBattleCommentary(state, 0, { apiKey: "test-key", fetcher: async () => { assert.fail("No request expected"); } });
  assert.equal(state.events[0].commentary, undefined);
});
