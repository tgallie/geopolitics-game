"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { WorldGameMap } from "./world-game-map";
import type { GameState } from "@/types/game";

export function SpectatorGame({ token }: { token: string }) {
  const [game, setGame] = useState<Omit<GameState, "ownerUserId"> | null>(null);
  const [message, setMessage] = useState("Loading game…");

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      let again = true;
      try {
        const response = await fetch(`/api/watch/${encodeURIComponent(token)}`, { cache: "no-store", signal: controller.signal });
        const data = await response.json();
        if (!active) return;
        if (!response.ok) {
          setMessage(data.message || "Could not refresh the game.");
          if (response.status === 404) { setGame(null); again = false; }
        } else {
          setGame(data);
          setMessage("Watching live — updates every 2 seconds. Only the owner can make moves.");
        }
      } catch { if (active) setMessage("Connection interrupted. Showing the last received state; reconnecting…"); }
      finally { if (active && again) timer = setTimeout(refresh, 2000); }
    }
    void refresh();
    return () => { active = false; controller.abort(); clearTimeout(timer); };
  }, [token]);

  return <main className="game-interface mx-auto w-full max-w-7xl p-4 text-slate-900 sm:p-8">
    <header className="game-header"><h1>World Conquerer — Spectator view</h1><p>Watch the battle unfold.</p></header>
    <section className="setup-panel mt-6">
      <p role="status">{message}</p>
      <p className="mt-3"><Link href="/">Play your own game</Link> — open the sign-in menu to register or resume your own games.</p>
    </section>
    {game && <>
      <section className="mt-6" aria-label="Turn status">
        <h2>Round {game.round} · {game.phase === "finished" ? "Game complete" : `${game.players.find((player) => player.id === game.currentPlayerId)?.name}'s turn`}</h2>
        <p>{game.phase === "finished" ? `Winner: ${game.players.find((player) => player.id === game.winnerId)?.name}` : `Phase: ${game.phase}`}</p>
      </section>
      <section className="mt-6" aria-label="Game board">
        <WorldGameMap game={game} fromId="" toId="" />
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {game.territories.map((territory) => <li className="border p-4" key={territory.country.id}><strong>{territory.country.name}</strong><p>{game.players.find((player) => player.id === territory.ownerId)?.name} · {territory.soldiers} soldiers</p></li>)}
        </ul>
      </section>
      <section className="mt-6" aria-label="Game events"><h2>Latest moves</h2>
        <ol className="event-list mt-3 space-y-2">{[...game.events].reverse().slice(0, 20).map((event) => <li key={event.sequence} className="border p-3">Round {event.round}: {event.message}
          {event.dice && <p>{event.dice.map((pair) => `${pair.attack} vs ${pair.defend} (${pair.winner})`).join(" · ")}</p>}
        </li>)}</ol>
      </section>
    </>}
  </main>;
}
