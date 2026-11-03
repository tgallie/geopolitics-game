import "server-only";
import { MongoClient } from "mongodb";

const mongoGlobal = globalThis as typeof globalThis & {
  gameMongoClient?: Promise<MongoClient>;
};

export async function getMongoClient() {
  const uri = process.env.MONGODB_URI?.trim();
  const databaseName = process.env.MONGODB_DB?.trim();

  if (!uri || !databaseName) {
    throw new Error("Set MONGODB_URI and MONGODB_DB in .env.local before using the database.");
  }

  // reuse the connection so i don't open another pool on every page reload
  if (!mongoGlobal.gameMongoClient) {
    const client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });
    mongoGlobal.gameMongoClient = client.connect().catch(async () => {
      mongoGlobal.gameMongoClient = undefined;
      await client.close().catch(() => undefined);
      // keep the connection details out of errors shown by the app
      throw new Error("Could not connect to the game database. Check the database configuration and network access.");
    });
  }

  return mongoGlobal.gameMongoClient;
}

export async function getDatabase() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB!.trim());
}
