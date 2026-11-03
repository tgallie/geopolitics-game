# Database setup — stage 1

This stage adds a server-only MongoDB connection and a read-only connection check.
Accounts and saved games are not implemented yet. The game still runs in the browser.

## Connect Atlas

1. Sign in at https://cloud.mongodb.com and create a project and cluster, or use your existing game cluster. Choose the free option if available for your account and region.
2. Create a database user with read/write access to the `geopolitics_game` database. This is separate from your Atlas website account.
3. In Network Access, allow your current public IP address. Hosting access will be configured when we deploy.
4. Choose Connect, then Drivers, then Node.js, and copy the connection string.
5. In the project root, copy `.env.example` to `.env.local` only if `.env.local` does not already exist.
6. Set `MONGODB_URI` to your connection string with the database username/password filled in. Percent-encode special characters in the username/password. Keep `MONGODB_DB=geopolitics_game`.
7. Run `npm run db:check` from the project folder. It should print `Database connection successful.`
8. Restart the development server after editing environment variables.

Never paste the real connection string into chat or commit `.env.local`. Only the empty example is tracked. Do not prefix database settings with `NEXT_PUBLIC_`.

The check only pings the database; it does not create accounts or collections or prove write permissions. MongoDB creates collections when data is first written. The server reuses a connection pool, including during development reloads, and retries on a later request if the initial connection fails.

Next stage: add account registration, login, logout, and sessions. After that, move game actions to the server and save games against their owner.
