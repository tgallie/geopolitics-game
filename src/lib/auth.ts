import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { getDatabase, getMongoClient } from "./db/mongodb.ts";

async function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!secret || secret.length < 32 || !baseURL) {
    throw new Error("Set BETTER_AUTH_SECRET and BETTER_AUTH_URL before using accounts.");
  }
  const database = await getDatabase();
  const client = await getMongoClient();
  // stop duplicate accounts and remove old sessions after they expire
  await Promise.all([
    database.collection("user").createIndex({ email: 1 }, { unique: true }),
    database.collection("session").createIndex({ token: 1 }, { unique: true }),
    database.collection("session").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("account").createIndex({ providerId: 1, accountId: 1 }, { unique: true }),
  ]);
  return betterAuth({
    appName: "World Conquerer",
    baseURL,
    secret,
    database: mongodbAdapter(database, { client }),
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    // don't put database errors or private account details in server logs
    logger: { disabled: true },
  });
}

let authPromise: ReturnType<typeof createAuth> | undefined;

export function getAuth() {
  // only connect when accounts are used, not while building the website
  authPromise ??= createAuth().catch((error) => {
    authPromise = undefined;
    throw error;
  });
  return authPromise;
}
