// temporary accounts for browser QA; this never changes an existing player
import fs from "node:fs";
import { randomUUID, randomBytes } from "node:crypto";
import nextEnv from "@next/env";
nextEnv.loadEnvConfig(process.cwd(), true);
const { getAuth } = await import("../src/lib/auth.ts");
const { getDatabase, getMongoClient } = await import("../src/lib/db/mongodb.ts");
const file = ".env.browser-check.json";
try {
  const db = await getDatabase();
  if (process.argv[2] === "cleanup") {
    const fixture = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!fixture.email.startsWith("browser-check-") || !fixture.email.endsWith("@example.invalid")) throw new Error("Not a browser fixture");
    const user = await db.collection("user").findOne({ email: fixture.email });
    if (user) {
      await db.collection("games").deleteMany({ ownerUserId: user._id.toString() });
      await db.collection("account").deleteMany({ userId: user._id });
      await db.collection("session").deleteMany({ userId: user._id });
      await db.collection("user").deleteOne({ _id: user._id, email: fixture.email });
    }
    fs.unlinkSync(file);
    console.log("Temporary browser account and its games removed.");
  } else {
    if (fs.existsSync(file)) throw new Error("Clean up the previous fixture first");
    const fixture = { email: `browser-check-${randomUUID()}@example.invalid`, password: randomBytes(24).toString("hex") };
    fs.writeFileSync(file, JSON.stringify(fixture), { flag: "wx" });
    await (await getAuth()).api.signUpEmail({ body: { ...fixture, name: "Browser QA" } });
    console.log("Temporary browser account ready; credentials stored only in ignored local fixture file.");
  }
} catch { console.error("Browser fixture setup/cleanup failed. No credentials displayed."); process.exitCode = 1; }
finally { await (await getMongoClient()).close(); }
