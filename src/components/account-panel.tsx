"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import styles from "./account-panel.module.css";

export function AccountPanel() {
  const { data: session, isPending, error: sessionError, refetch } = authClient.useSession();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    const email = String(fields.get("email") ?? "").trim().toLowerCase();
    const password = String(fields.get("password") ?? "");
    const name = String(fields.get("name") ?? "").trim();
    if (register && !name) { setError("Enter your player name."); return; }
    if (register && password !== fields.get("confirmation")) {
      setError("The passwords don't match.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = register
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.status === 429
          ? "Too many attempts. Wait a minute and try again."
          : register
            ? "Could not create your account. Check your details, or log in if you already registered."
            : "Could not log in. Check your email and password, then try again.");
        return;
      }
      // clear the password fields once i'm signed in
      form.reset();
      await refetch();
    } catch {
      setError("Could not reach accounts. Please try again shortly.");
    } finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) { setError("Could not log out. Please try again."); return; }
      await refetch();
    } catch { setError("Could not log out. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <aside className={`${styles.panel} ${!session ? styles.welcome : ""}`} aria-label="Player account">
      <div className={styles.bar}>
        {session ? <Link href="/">World Conquerer</Link> : <div className={styles.heading}><h1>World Conquerer</h1><p>Choose your country. Build your army. Conquer the world.</p></div>}
        {isPending ? <span role="status">Checking account…</span> : session ? (
          <div className={styles.actions}>
            <span>Player: {session.user.name}</span>
            <button type="button" onClick={logout} disabled={busy}>{busy ? "Please wait…" : "Log out"}</button>
          </div>
        ) : null}

      </div>
      {sessionError && <p role="status">Accounts are unavailable right now. <button type="button" onClick={() => refetch()}>Retry</button></p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {!isPending && !session && (
        <section id="account-form" className={styles.formArea}>
          <div className={styles.choices} aria-label="Account options">
            <button type="button" disabled={busy} aria-pressed={!register} onClick={() => { setRegister(false); setError(""); }}>Sign in</button>
            <button type="button" disabled={busy} aria-pressed={register} onClick={() => { setRegister(true); setError(""); }}>Sign up</button>
          </div>
          <h2>{register ? "Create your player account" : "Welcome back"}</h2>
          <p>Sign in to resume your games, or sign up to start your first conquest.</p>
          <form onSubmit={submit} key={register ? "register" : "login"}>
            <fieldset disabled={busy}>
              {register && <label>Player name<input name="name" autoComplete="nickname" required maxLength={40} /></label>}
              <label>Email<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
              <label>Password<input name="password" type="password" autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : 1} maxLength={128} aria-describedby={register ? "password-help" : undefined} /></label>
              {register && <>
                <p id="password-help">Use 12–128 characters. A long passphrase works well.</p>
                <label>Confirm password<input name="confirmation" type="password" autoComplete="new-password" required maxLength={128} /></label>
              </>}
              <button type="submit">{busy ? "Please wait…" : register ? "Create account & play" : "Sign in & play"}</button>
            </fieldset>
          </form>
        </section>
      )}
    </aside>
  );
}
