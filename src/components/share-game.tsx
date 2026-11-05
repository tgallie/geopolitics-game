"use client";

import { useEffect, useState } from "react";

export function ShareGame({ gameId }: { gameId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/games/${gameId}/share`, { cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Could not load sharing settings.");
      const data = await response.json();
      if (active) { setToken(data.token); setOrigin(window.location.origin); }
    }).catch(() => { if (active) setMessage("Could not load sharing settings. Try Create spectator link again."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [gameId]);

  async function update(method: "POST" | "DELETE") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/games/${gameId}/share`, { method });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setOrigin(window.location.origin);
      setToken(data.token);
      setMessage(method === "DELETE" ? "Sharing stopped. The old link no longer works." : "Link ready. Anyone with this link can watch, but cannot make moves.");
    } catch { setMessage("Could not update sharing. Please try again."); }
    finally { setBusy(false); }
  }

  const url = token ? `${origin}/watch/${token}` : "";
  return <div className="mt-5 border-t-2 border-slate-800 pt-4">
    <h3>Invite spectators</h3>
    <p className="mt-2">Spectators see the board and moves as you play. They do not need an account.</p>
    {token ? <>
      <label className="mt-3 block">Spectator link<input className="mt-2 w-full border p-2" readOnly value={url} onFocus={(event) => event.target.select()} /></label>
      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(url); setMessage("Link copied."); } catch { setMessage("Select the link above and copy it manually."); } }}>Copy link</button>
        <a href={url} target="_blank" rel="noopener noreferrer">Open spectator view</a>
        <button type="button" disabled={busy} onClick={() => update("DELETE")}>Stop sharing</button>
      </div>
    </> : <button className="mt-3 border px-4 py-2" type="button" disabled={busy} onClick={() => update("POST")}>{busy ? "Please wait…" : "Create spectator link"}</button>}
    {origin.includes("localhost") && <p className="mt-3">This local link works on this computer. Sharing with other people will work once the game is hosted.</p>}
    <p role="status" className="mt-3">{message}</p>
  </div>;
}
