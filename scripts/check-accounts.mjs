import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);
const { getAuth } = await import("../src/lib/auth.ts");
const { getDatabase, getMongoClient } = await import("../src/lib/db/mongodb.ts");
const email = `account-check-${randomUUID()}@example.invalid`;
const password = randomBytes(24).toString("hex");
const base = process.env.BETTER_AUTH_URL;
let database;

try {
  const auth = await getAuth();
  database = await getDatabase();
  async function request(path, body, cookie, origin = base) {
    return auth.handler(new Request(`${base}/api/auth/${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        origin,
        "content-type": "application/json",
        "x-forwarded-for": "192.0.2.41",
        ...(cookie ? { cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }));
  }
  const credentials = { email, password, name: "Temporary account check" };
  assert.equal(await (await request("get-session")).json(), null, "Anonymous session must be empty");
  assert.ok(!(await request("sign-up/email", { ...credentials, password: "short" })).ok, "Short passwords must fail");
  const signup = await request("sign-up/email", credentials);
  assert.ok(signup.ok, "Registration must succeed");
  const cookies = signup.headers.getSetCookie();
  assert.ok(cookies.some((value) => /httponly/i.test(value) && /samesite=lax/i.test(value)), "Session cookie must be HTTP-only and same-site");
  const cookie = cookies.map((value) => value.split(";")[0]).join("; ");
  const session = await (await request("get-session", undefined, cookie)).json();
  assert.ok(session?.user?.email === email, "Cookie must restore the registered account");
  assert.ok(!(await request("sign-up/email", credentials)).ok, "Duplicate registration must fail");
  assert.ok(!(await request("sign-in/email", { email, password: "wrong-password" })).ok, "Wrong password must fail");
  assert.ok((await request("sign-in/email", { email, password })).ok, "Correct password must succeed");
  assert.ok(!(await request("sign-out", {}, cookie, "https://untrusted.example")).ok, "Cross-origin logout must fail");
  assert.ok((await request("sign-out", {}, cookie)).ok, "Logout must succeed");
  assert.equal(await (await request("get-session", undefined, cookie)).json(), null, "Revoked session must fail");
  const user = await database.collection("user").findOne({ email });
  assert.ok(!!user, "Account must be persisted in MongoDB");
  const account = await database.collection("account").findOne({ userId: user._id });
  assert.ok(!!account?.password && account.password !== password, "Password must be stored as a hash");
  const login = await request("sign-in/email", { email, password });
  const freshCookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  await database.collection("session").updateMany({ userId: user._id }, { $set: { expiresAt: new Date(0) } });
  assert.equal(await (await request("get-session", undefined, freshCookie)).json(), null, "Expired session must fail");
  console.log("Account checks passed: registration, password hashing, duplicate rejection, login, cookie persistence, origin protection, logout, and expiry.");
} catch (error) {
  // only show our assertion descriptions, never driver errors or credentials
  console.error(error?.code === "ERR_ASSERTION" ? `Account check failed: ${error.message.split("\n")[0]}` : "Account check failed. Check local configuration and database access.");
  process.exitCode = 1;
} finally {
  try {
    if (database) {
      const user = await database.collection("user").findOne({ email });
      if (user) {
        await database.collection("session").deleteMany({ userId: user._id });
        await database.collection("account").deleteMany({ userId: user._id });
        await database.collection("user").deleteOne({ _id: user._id, email });
      }
      console.log("Temporary test account removed.");
    }
  } finally {
    await (await getMongoClient()).close();
  }
}
