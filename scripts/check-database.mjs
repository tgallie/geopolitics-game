import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);

try {
  const { getDatabase } = await import("../src/lib/db/mongodb.ts");
  const database = await getDatabase();
  // check the connection without changing any saved data
  await database.command({ ping: 1 });
  console.log("Database connection successful.");
} catch {
  // don't print driver errors because they can contain private connection details
  console.error("Database check failed. Check MONGODB_URI and MONGODB_DB in .env.local, your Atlas database user, and the Atlas IP access list.");
  process.exitCode = 1;
} finally {
  const client = await globalThis.gameMongoClient?.catch(() => undefined);
  await client?.close();
}
