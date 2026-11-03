# Player accounts

The account panel above the game supports email/password registration, login and logout. Registration signs the player in automatically. The panel stays on the game page so opening it does not navigate away from an ongoing game.

Better Auth handles password hashing, HTTP-only same-site session cookies, origin checks and session validation. MongoDB stores users, credential accounts, sessions and rate limits. Sessions expire after seven days and renew after one day of activity; logout revokes the current session. Cookies use Secure on HTTPS production sites. Account endpoints limit repeated sign-in and sign-up attempts.

## Local setup

Keep `MONGODB_URI`, `MONGODB_DB`, `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` in `.env.local`. A random secret has been generated for this local setup. Never commit it. Other installations must generate their own secret (at least 32 random characters). Set the URL to `http://localhost:3000` locally, and the exact HTTPS address when deployed. Restart the server after editing these settings. Use the configured address rather than the network-IP address to log in.

`npm run accounts:check` creates a uniquely named temporary account in the configured database, tests authentication, then removes that account and its credential/session records. Do not run it against a database where you are not authorised to create test records. Rate-limit records may remain until expiry.

## Current scope

Accounts persist, but game progress still lives in the browser. Guest play remains available. Accounts are not yet attached to games, and this stage does not claim to enforce ownership of game actions. The next stage moves games and move validation to the server and saves them against the authenticated player.

Email verification and password-reset emails are not configured yet. Add an email provider and those flows before a public launch. During hosting setup, configure the trusted proxy/IP headers for rate limiting and check HTTPS cookies with the final domain.

References: https://better-auth.com/docs/integrations/next and https://better-auth.com/docs/adapters/mongo
