# AI battle commentary

Battle events can now receive real OpenAI Responses API commentary, shown beside authoritative dice and loss records to players and spectators. The server sends only recent game events and involved army counts, not accounts, emails, session tokens or database identifiers. The model narrates; it cannot choose dice or modify game rules.

Set OPENAI_API_KEY privately in .env.local and restart the server. OPENAI_MODEL defaults to gpt-4.1-mini; use a Responses-compatible text model available to your API account. AI_COMMENTARY_ENABLED=false disables external requests. An API key/account with available usage is required for live generation.

Each battle command makes at most one request, capped at 180 output tokens and a five-second timeout, without automatic retries. Requests use store=false. Commentary is saved inside the affected event with source/model information. Reloading, spectating and listing games never regenerate it. Failed or unconfigured requests produce a deterministic summary explicitly labelled as AI unavailable. These summaries do not satisfy the brief's live LLM requirement by themselves.

Commentary is generated before the conditional game save. Concurrent requests can generate two responses but only one revision can commit. Provider latency adds to NPC playback time; the application displays each accepted move instead of skipping events. AI text may still contain inaccuracies; exact dice, losses and outcomes remain visible separately.

Validation: npm test exercises response parsing, privacy, missing configuration, refusal, rate-limit failures, timeouts and unchanged game facts using a mocked provider. A live check with a configured key is still required before submission.

Official references: https://developers.openai.com/api/docs/guides/text and https://developers.openai.com/api/docs/models/gpt-4.1-mini
