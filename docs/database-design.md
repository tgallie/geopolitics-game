# Database design and boundaries

MongoDB Atlas is the online NoSQL store. Database configuration comes from private environment variables; one MongoClient pool is reused on the server. No database module is importable from a client component (`server-only`).

## Layers

1. React components and `use-saved-game.ts`: display server state and send commands.
2. Next route handlers and `saved-games.ts`: authenticate, validate input/origin, authorise the owner, orchestrate rules/commentary and return HTTP responses.
3. GameEngine/BattleEngine and NPC strategy: game rules and deterministic state transitions with injected randomness, independent of MongoDB.
4. `lib/db/game-repository.ts`: all game queries, projections, writes, sharing and game indexes. `auth-store.ts`: account/session indexes. `mongodb.ts`: connection configuration and pooling. Better Auth's MongoDB adapter owns its credential/session operations.

## Collections

| Collection | Purpose and fields | Relationships / indexes |
| --- | --- | --- |
| user | Better Auth identity: ObjectId, name, normalised email, verification flag, timestamps | Unique email |
| account | Credential provider, accountId, userId, password hash | userId refers to user; unique providerId + accountId |
| session | Token, userId, expiresAt, timestamps | userId refers to user; unique token; expiry TTL index |
| rateLimit | Better Auth request counters | Managed by the authentication adapter |
| games | UUID _id, ownerUserId, countryName, createdAt, updatedAt, complete state, optional shareToken | ownerUserId stores user's string ID; ownerUserId + updatedAt index; unique partial shareToken index |

Each game embeds its players, ten territories, country population snapshots, turn order, active battle, revision and ordered events. Commentary is embedded in its battle event, including AI/fallback provenance and model when generated. Embedding provides a single atomic game update and prevents an external population-data update from changing ongoing armies. Authentication collections remain separate from game state.

## Consistency and privacy

Moves update only the document matching game ID, authenticated owner and expected revision. Exactly one competing update can commit; another gets a conflict and must reload. Repository methods repeat the owner filter on reads, moves and sharing changes. Public viewing uses the share token and the controller removes ownerUserId before responding. Revocation removes the token; subsequent views fail. Server-generated dice and saved snapshots prevent refreshing to undo an accepted move.

MongoDB does not enforce foreign keys. User deletion is not currently exposed; any future deletion flow must explicitly handle owned games, credentials and sessions. The current design embeds the full event history, so very long games could approach MongoDB's document size limit; production scaling should split event history into a separate collection with transactional/revision coordination. The saved-game menu currently lists the latest 100 games, rather than offering pagination.

## Verification

`npm run db:check`: connection ping.
`npm run accounts:check`: registration, hashes, sessions, origin checks, logout and expiry.
`npm run saved-games:check`: saved games, account isolation, simultaneous moves, public viewing and revocation.

Integration checks use uniquely named temporary data and remove only their own accounts and games. They require Atlas access. Credentials never belong in the repository or screenshots.
