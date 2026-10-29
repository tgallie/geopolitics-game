"use client";

import { useEffect, useRef, useState } from "react";
import { countries } from "@/data/countries";
import { advanceNpc } from "@/lib/ai/npc-strategy";
import { GameEngine } from "@/lib/game/game-engine";
import type { GameAction, GameState } from "@/types/game";

function randomFraction() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0] / 2 ** 32;
}

export default function Home() {
  // keep the game in one place so every button uses the same rules
  const engine = useRef<GameEngine | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState(1);
  const [error, setError] = useState("");
  const [autoPlay, setAutoPlay] = useState(false);
  const [playbackDelay, setPlaybackDelay] = useState(700);

  // play one NPC decision at a time so i can still see what each one did
  useEffect(() => {
    if (!autoPlay || !game || game.phase === "finished") return;
    const player = game.players.find((item) => item.id === game.currentPlayerId);
    if (player?.kind !== "npc") return;

    const timer = window.setTimeout(() => {
      try {
        if (!engine.current) return;
        const next = advanceNpc(engine.current);
        setGame(next);
        setError("");
        if (next.phase === "finished" || next.players.find((item) => item.id === next.currentPlayerId)?.kind === "human") {
          setAutoPlay(false);
        }
      } catch (cause) {
        setAutoPlay(false);
        setError(cause instanceof Error ? cause.message : "The opponent could not move.");
      }
    }, playbackDelay);

    return () => window.clearTimeout(timer);
  }, [autoPlay, game, playbackDelay]);

  function startGame() {
    if (!selectedCountryId) return;
    try {
      const next = GameEngine.create({
        id: crypto.randomUUID(),
        ownerUserId: "local-player",
        selectedCountryId,
        countries,
      }, randomFraction);
      engine.current = next;
      setGame(next.snapshot);
      setFromId(selectedCountryId);
      setToId("");
      setAmount(1);
      setError("");
      setAutoPlay(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start the game.");
    }
  }

  function play(action: GameAction) {
    if (!engine.current || !game) return;
    try {
      setGame(engine.current.dispatch(game.currentPlayerId, game.revision, action));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "That move could not be made.");
    }
  }

  function playNpc() {
    if (!engine.current || !game) return;
    try {
      setGame(advanceNpc(engine.current));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The opponent could not move.");
    }
  }

  const currentPlayer = game?.players.find((player) => player.id === game.currentPlayerId);
  const isMyTurn = currentPlayer?.kind === "human" && game?.phase !== "finished";
  const mine = game?.territories.filter((territory) => territory.ownerId === game.currentPlayerId) ?? [];
  const targets = game?.territories.filter((territory) => territory.ownerId !== game.currentPlayerId) ?? [];
  const from = mine.find((territory) => territory.country.id === fromId);
  const transferTargets = mine.filter((territory) => territory.country.id !== fromId);
  const battleFrom = game?.territories.find((territory) => territory.country.id === game.battle?.attackingCountryId);
  const battleTo = game?.territories.find((territory) => territory.country.id === game.battle?.defendingCountryId);

  return (
    <main className="mx-auto max-w-5xl p-6 text-zinc-900 dark:text-zinc-100 sm:p-10">
      <h1 className="text-3xl font-bold">Geopolitics game</h1>
      {!game ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Choose your country</h2>
          <p className="mt-2">Pick your country, then start a game against nine opponents.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => (
              <li key={country.id}>
                <button type="button" onClick={() => setSelectedCountryId(country.id)}
                  aria-pressed={selectedCountryId === country.id}
                  className={`w-full rounded border p-4 text-left ${selectedCountryId === country.id ? "border-blue-600 bg-blue-600 text-white" : "border-zinc-400"}`}>
                  <span className="block font-semibold">{country.name}</span>
                  <span>{country.baseSoldierValue} starting soldiers</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={startGame} disabled={!selectedCountryId}
            className="mt-6 rounded bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
            Start game
          </button>
        </section>
      ) : (
        <>
          <section className="mt-8 rounded border border-zinc-400 p-5" aria-label="Turn status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Round {game.round}: {currentPlayer?.name}</h2>
                <p>Phase: {game.phase} · Reinforcements: {game.reinforcementsRemaining}</p>
              </div>
              {game.phase !== "finished" && !isMyTurn && (
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={playNpc} disabled={autoPlay}
                    className="rounded border border-zinc-400 px-4 py-2 disabled:opacity-50">Next NPC move</button>
                  <button type="button" onClick={() => setAutoPlay(!autoPlay)}
                    className="rounded bg-blue-600 px-4 py-2 text-white">{autoPlay ? "Pause" : "Play NPC turns"}</button>
                  <label>Speed
                    <select value={playbackDelay} onChange={(event) => setPlaybackDelay(Number(event.target.value))}
                      className="ml-2 rounded border border-zinc-400 bg-transparent p-2">
                      <option value={1200}>Slow</option>
                      <option value={700}>Normal</option>
                      <option value={100}>Fast forward</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
            {game.phase === "finished" && <p className="mt-3 font-bold">Winner: {game.players.find((player) => player.id === game.winnerId)?.name}</p>}
          </section>

          <section className="mt-8" aria-label="Game board">
            <h2 className="text-2xl font-semibold">Game board</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {game.territories.map((territory) => {
                const owner = game.players.find((player) => player.id === territory.ownerId);
                return (
                  <li key={territory.country.id} className={`rounded border p-4 ${owner?.kind === "human" ? "border-blue-600" : "border-zinc-400"}`}>
                    <h3 className="font-semibold">{territory.country.name}</h3>
                    <p>{owner?.name} · {territory.soldiers} soldiers</p>
                  </li>
                );
              })}
            </ul>
          </section>

          {isMyTurn && (
            <section className="mt-8 rounded border border-zinc-400 p-5" aria-label="Your move">
              <h2 className="text-xl font-semibold">Your move</h2>
              {game.phase === "reinforcement" && <p className="mt-2">Place your {game.reinforcementsRemaining} reinforcements before taking an action.</p>}
              {(game.phase === "reinforcement" || game.phase === "action") && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <label>From your country
                    <select value={fromId} onChange={(event) => setFromId(event.target.value)} className="ml-2 rounded border border-zinc-400 bg-transparent p-2">
                      <option value="">Choose</option>
                      {mine.map((territory) => <option key={territory.country.id} value={territory.country.id}>{territory.country.name} ({territory.soldiers})</option>)}
                    </select>
                  </label>
                  <label>Soldiers
                    <input type="number" min="1" step="1" value={amount} onChange={(event) => setAmount(Number(event.target.value))}
                      className="ml-2 w-20 rounded border border-zinc-400 bg-transparent p-2" />
                  </label>
                </div>
              )}
              {game.phase === "reinforcement" && (
                <button type="button" disabled={!from} onClick={() => play({ type: "reinforce", countryId: fromId, amount })}
                  className="mt-4 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">Place soldiers</button>
              )}
              {game.phase === "action" && (
                <>
                  <label className="mt-4 block">Target country
                    <select value={toId} onChange={(event) => setToId(event.target.value)} className="ml-2 rounded border border-zinc-400 bg-transparent p-2">
                      <option value="">Choose</option>
                      {game.territories.filter((territory) => territory.country.id !== fromId).map((territory) => (
                        <option key={territory.country.id} value={territory.country.id}>{territory.country.name} ({territory.soldiers})</option>
                      ))}
                    </select>
                  </label>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" disabled={!from || !targets.some((territory) => territory.country.id === toId) || game.attackUsedThisTurn}
                      onClick={() => play({ type: "attack", fromId, toId })} className="rounded bg-red-700 px-4 py-2 text-white disabled:opacity-50">Attack</button>
                    <button type="button" disabled={!from || !transferTargets.some((territory) => territory.country.id === toId)}
                      onClick={() => play({ type: "transfer", fromId, toId, amount })} className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50">Transfer soldiers</button>
                    <button type="button" onClick={() => play({ type: "skip" })} className="rounded border border-zinc-400 px-4 py-2">End turn</button>
                  </div>
                </>
              )}
              {game.phase === "combat" && (
                <div className="mt-4">
                  <p>{battleFrom?.country.name} attacks {battleTo?.country.name}. Phase {game.battle?.phaseNumber ?? 0}.</p>
                  <div className="mt-3 flex gap-3">
                    <button type="button" onClick={() => play({ type: "roll" })} className="rounded bg-red-700 px-4 py-2 text-white">Roll dice</button>
                    <button type="button" onClick={() => play({ type: "skip" })} className="rounded border border-zinc-400 px-4 py-2">Stop attack</button>
                  </div>
                </div>
              )}
              {game.phase === "conquest" && (
                <div className="mt-4">
                  <p>You captured {battleTo?.country.name}. Move soldiers from {battleFrom?.country.name} to occupy it.</p>
                  <label className="mt-3 block">Soldiers to move
                    <input type="number" min="1" max={(battleFrom?.soldiers ?? 1) - 1} step="1" value={amount}
                      onChange={(event) => setAmount(Number(event.target.value))} className="ml-2 w-20 rounded border border-zinc-400 bg-transparent p-2" />
                  </label>
                  <button type="button" onClick={() => play({ type: "occupy", amount })} className="mt-3 rounded bg-blue-600 px-4 py-2 text-white">Occupy country</button>
                </div>
              )}
            </section>
          )}

          <section className="mt-8" aria-label="Game events">
            <h2 className="text-xl font-semibold">What happened</h2>
            <ol className="mt-3 space-y-2" aria-live="polite">
              {[...game.events].reverse().slice(0, 20).map((event) => (
                <li key={event.sequence} className="rounded border border-zinc-300 p-3 dark:border-zinc-700">
                  <span className="font-semibold">Round {event.round}:</span> {event.message}
                  {event.dice && <span className="block text-sm">{event.dice.map((pair) => `${pair.attack} vs ${pair.defend} (${pair.winner})`).join(" · ")}</span>}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
      {error && <p role="alert" className="mt-5 rounded border border-red-600 p-3 text-red-700 dark:text-red-300">{error}</p>}
    </main>
  );
}
