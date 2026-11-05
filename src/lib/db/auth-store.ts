import "server-only";
import { getDatabase, getMongoClient } from "./mongodb.ts";

export async function prepareAuthStore() {
  const database = await getDatabase();
  const client = await getMongoClient();
  await Promise.all([
    database.collection("user").createIndex({ email: 1 }, { unique: true }),
    database.collection("session").createIndex({ token: 1 }, { unique: true }),
    database.collection("session").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    database.collection("account").createIndex({ providerId: 1, accountId: 1 }, { unique: true }),
  ]);
  return { database, client };
}
