import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const { addBattleCommentary } = await import("../src/lib/ai/battle-commentary.ts");
if (!process.env.OPENAI_API_KEY?.trim()) {
  console.error("Set OPENAI_API_KEY in .env.local and save the file first.");
  process.exitCode = 1;
} else if (process.env.AI_COMMENTARY_ENABLED === "false") {
  console.error("AI commentary is disabled in .env.local.");
  process.exitCode = 1;
} else {
  // one small real request using made-up battle facts, never account data
  const state = { round: 1, phase: "combat", territories: [
    { country: { id: "ZA", name: "South Africa" }, soldiers: 7 },
    { country: { id: "GB", name: "United Kingdom" }, soldiers: 3 },
  ], events: [{ kind: "roll", message: "South Africa loses 1; United Kingdom loses 0.",
    fromCountryId: "ZA", toCountryId: "GB", dice: [{ attack: 2, defend: 5, winner: "defender" }] }] };
  let status;
  let reason;
  await addBattleCommentary(state, 0, { timeoutMs: 15000, fetcher: async (...args) => {
    const response = await fetch(...args);
    status = response.status;
    if (!response.ok) {
      const error = await response.clone().json().catch(() => ({}));
      if (["insufficient_quota", "rate_limit_exceeded", "invalid_api_key", "model_not_found"].includes(error.error?.code)) reason = error.error.code;
    }
    return response;
  } });
  const result = state.events[0].commentary;
  if (result?.source === "ai") {
    console.log(`Live AI commentary passed (${result.model}): ${result.text}`);
  } else {
    console.error(`Live AI check failed (${status ? `HTTP ${status}${reason ? `: ${reason}` : ""}` : "timeout or connection failure"}). Check API billing, model access and network. No credentials displayed.`);
    process.exitCode = 1;
  }
}
