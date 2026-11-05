# Saved games

Log in, pick a country and start a game. Each accepted move is saved before it appears on the board. The saved-game list shows the 100 most recently played games, including finished games. Back to my games lets a player resume another game or start a new one. Reload saved game retrieves the current state if another tab has changed it or a request was interrupted.

The browser sends only the selected starting country or an action plus the last known revision. The server chooses opponents, turn order, dice and NPC decisions. It validates the current session, ownership and game rules before updating MongoDB. A conditional update on the revision prevents simultaneous tabs from overwriting each other's moves. The database snapshot, including country populations, is restored without rerolling or resetting a turn.

API routes:
- `GET /api/games`: this account's latest 100 saved-game summaries.
- `POST /api/games`: create a game from `selectedCountryId`.
- `GET /api/games/:id`: resume an owned game.
- `POST /api/games/:id`: apply `{ revision, action }` or advance one NPC decision with `{ revision, npc: true }`.

Mutations require the configured website Origin and JSON. A missing session returns 401, a missing or other player's game returns 404, and a stale revision returns 409. No endpoint accepts a replacement game snapshot, dice, owner ID or arbitrary NPC decision from the browser. Responses are not cached.

Run `npm run saved-games:check` for integration checks against the configured Atlas database. It creates two temporary accounts and games and removes them afterward. It checks account isolation, invalid actions, reloading, multiple games, server ownership, and concurrent updates. Use only a database where test writes are authorised.

Account recovery emails and hosting remain later stages. Old games that only existed in browser memory cannot be imported as trusted saved games.

## Spectator links

Open a saved game and choose Create spectator link. Copy the link or open the spectator view in another tab. Anyone holding the link can watch the board, troop counts, dice and latest moves without an account. The page polls every two seconds; spectators do not advance NPC turns or make moves. The owner must keep playing for the game to progress.

Stop sharing revokes the link. Creating a link again generates a new token; old links stay revoked. Sharing is disabled by default, and only the logged-in owner can enable or revoke it. Public responses omit the owner's account identifier, and spectators cannot call private move endpoints without the owner's authenticated session. Revocation is reflected on the next poll; information already viewed cannot be recalled.

`/watch/:token` renders the public view and `GET /api/watch/:token` returns its current state. `/api/games/:id/share` supports owner-only GET, POST and DELETE to inspect, enable and revoke sharing. Token lookups use a unique partial index. Spectator pages are marked noindex and responses are uncached.

Localhost links work only on the same computer. Public sharing will work after deployment; use the final website address in BETTER_AUTH_URL. The saved-games integration check also tests public reading, account-data omission, ownership, rejected mutations and revocation.
