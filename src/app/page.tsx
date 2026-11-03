"use client";

import { useState } from "react";
import { GameTutorial } from "@/components/game-tutorial";
import { WorldGameMap } from "@/components/world-game-map";
import { countries } from "@/data/countries";
import { authClient } from "@/lib/auth-client";
import { useSavedGame } from "@/lib/game/use-saved-game";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();
  if (!session) return (
    <main className="game-interface mx-auto w-full max-w-7xl p-4 text-slate-900 sm:p-8">
      <header className="game-header">
        <h1 className="text-3xl font-bold">World Conquerer</h1>
        <p>{isPending ? "Checking your account…" : "Log in or register above to start and save your games."}</p>
        <GameTutorial />
      </header>
    </main>
  );
  // changing accounts clears the old board before i load another player's games
  return <SavedGameScreen key={session.user.id} />;
}

function SavedGameScreen() {
  const { game, savedGames, listLoading, busy, error, autoPlay, setAutoPlay, playbackDelay, setPlaybackDelay,
    start, resume, play, playNpc, leave, refreshList } = useSavedGame();
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [countrySearch, setCountrySearch] = useState("");
  const [soldierFilter, setSoldierFilter] = useState("all");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState(1);

  async function startGame() {
    if (!selectedCountryId) return;
    if (await start(selectedCountryId)) {
      setFromId(selectedCountryId);
      setToId("");
      setAmount(1);
    }
  }

  async function resumeGame(id: string) {
    const next = await resume(id);
    if (next) {
      const human = next.players.find((player) => player.kind === "human");
      setFromId(next.territories.find((territory) => territory.ownerId === human?.id)?.country.id ?? "");
      setToId("");
      setAmount(1);
    }
  }

  function selectOnMap(countryId: string) {
    if (!game || game.players.find((player) => player.id === game.currentPlayerId)?.kind !== "human") return;
    const territory = game.territories.find((item) => item.country.id === countryId);
    if (!territory) return;
    if (territory.ownerId === game.currentPlayerId) setFromId(countryId);
    else if (game.phase === "action") setToId(countryId);
  }

  const currentPlayer = game?.players.find((player) => player.id === game.currentPlayerId);
  const isMyTurn = currentPlayer?.kind === "human" && game?.phase !== "finished";
  const mine = game?.territories.filter((territory) => territory.ownerId === game.currentPlayerId) ?? [];
  const targets = game?.territories.filter((territory) => territory.ownerId !== game.currentPlayerId) ?? [];
  const from = mine.find((territory) => territory.country.id === fromId);
  const transferTargets = mine.filter((territory) => territory.country.id !== fromId);
  const battleFrom = game?.territories.find((territory) => territory.country.id === game.battle?.attackingCountryId);
  const battleTo = game?.territories.find((territory) => territory.country.id === game.battle?.defendingCountryId);
  const selectedCountry = countries.find((country) => country.id === selectedCountryId);
  // search the available countries without changing the list used to make a game
  const visibleCountries = countries.filter((country) => {
    const matchesName = country.name.toLocaleLowerCase().includes(countrySearch.trim().toLocaleLowerCase());
    const matchesSoldiers = soldierFilter === "all" ||
      (soldierFilter === "low" && country.baseSoldierValue <= 3) ||
      (soldierFilter === "medium" && country.baseSoldierValue >= 4 && country.baseSoldierValue <= 6) ||
      (soldierFilter === "high" && country.baseSoldierValue >= 7);
    return matchesName && matchesSoldiers;
  });

  return (
    <main className="game-interface mx-auto w-full max-w-7xl p-4 text-slate-900 sm:p-8">
      <header className="game-header">
        <p className="game-eyebrow">WORLD CONQUEST</p>
        <h1 className="text-3xl font-bold">World Conquerer</h1>
        <p>Choose your country. Build your army. Conquer all 10 countries to win.</p>
        <GameTutorial onOpen={() => setAutoPlay(false)} />
      </header>
      <section className="setup-panel mt-6" aria-label="Saved games">
        <h2 className="text-xl font-semibold">{game ? "Your saved game" : "My saved games"}</h2>
        <p role="status" className="mt-2">{busy ? "Please wait — confirming with the server…" : game ? "All displayed moves are saved. You can leave and resume later." : "Your 100 most recently played games appear here."}</p>
        {game ? <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" disabled={busy} onClick={leave} className="rounded border px-4 py-2">Back to my games / New game</button>
          <button type="button" disabled={busy} onClick={() => resumeGame(game.id)} className="rounded border px-4 py-2">Reload saved game</button>
        </div> : <>
          <button type="button" disabled={busy || listLoading} onClick={refreshList} className="mt-3 rounded border px-4 py-2">Refresh saved games</button>
          {listLoading ? <p role="status">Loading saved games…</p> : savedGames.length === 0 ? <p className="mt-3">No saved games yet. Choose a country below to start.</p> :
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {savedGames.map((saved) => <li key={saved.id} className="rounded border p-3">
                <p><strong>{saved.countryName}</strong> · Round {saved.round} · {saved.phase === "finished" ? "Finished" : "In progress"}</p>
                <p className="mt-2">Last played: {new Date(saved.updatedAt).toLocaleString()}</p>
                <button type="button" disabled={busy} onClick={() => resumeGame(saved.id)} className="mt-3 rounded border px-4 py-2">{saved.phase === "finished" ? "View result" : "Resume game"}</button>
              </li>)}
            </ul>}
        </>}
      </section>
      <fieldset disabled={busy} className="min-w-0 border-0 p-0">
      {!game ? (
        <section className="setup-panel mt-6">
          <h2 className="text-xl font-semibold">1. Choose your country</h2>
          <p className="mt-2">Pick your country, then start a game against nine opponents.</p>
          <p className="mt-2 text-sm">Choose from 32 countries. Population estimates for 2026 come from <a href="https://www.worldometers.info/world-population/population-by-country/" target="_blank" rel="noreferrer" className="underline">Worldometer</a>.</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <label className="flex flex-col gap-1">Search countries
              <input type="search" value={countrySearch} onChange={(event) => setCountrySearch(event.target.value)}
                placeholder="Country name" className="rounded border border-zinc-400 bg-transparent px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1">Starting soldiers
              <select value={soldierFilter} onChange={(event) => setSoldierFilter(event.target.value)}
                className="rounded border border-zinc-400 bg-transparent px-3 py-2">
                <option value="all">All strengths</option>
                <option value="low">1–3 soldiers</option>
                <option value="medium">4–6 soldiers</option>
                <option value="high">7–9 soldiers</option>
              </select>
            </label>
          </div>
          <p className="mt-3 text-sm" role="status">Showing {visibleCountries.length} of {countries.length} countries.</p>
          {visibleCountries.length === 0 && <p className="mt-4">No countries match. Try another name or strength.</p>}
          <ul className="country-picker mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCountries.map((country) => (
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
          {selectedCountry && (
            <p className="mt-5">Selected: <strong>{selectedCountry.name}</strong> · Population {selectedCountry.population.toLocaleString("en-ZA")} ({selectedCountry.populationYear}).</p>
          )}
          <button type="button" onClick={startGame} disabled={!selectedCountryId}
            className="start-game mt-6 rounded bg-blue-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
            Start game
          </button>
        </section>
      ) : (
        <>
          <section className="mt-8 rounded border border-zinc-400 p-5" aria-label="Turn status">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{isMyTurn ? "Your turn" : `${currentPlayer?.name} is playing`} · Round {game.round}</h2>
                <p className="mt-2 text-slate-600">{game.phase === "reinforcement" ? `Place ${game.reinforcementsRemaining} new soldiers.` : game.phase === "combat" ? "Battle in progress" : game.phase === "conquest" ? "Move soldiers into the captured country." : game.phase === "finished" ? "Game complete" : isMyTurn ? "Choose a target to attack, or end your turn." : "Watch the opponents, or use Play to continue."}</p>
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
                      <option value={350}>Fast forward</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
            {game.phase === "finished" && <p className="mt-3 font-bold">Winner: {game.players.find((player) => player.id === game.winnerId)?.name}</p>}
          </section>

          <div className="play-layout"><section className="mt-6" aria-label="Game board">
            <h2 className="text-2xl font-semibold">Game board</h2>
            <p className="mb-4 mt-2">Click a square marker to choose your source or attack target. The number shows soldiers.</p>
            <WorldGameMap game={game} fromId={fromId} toId={toId} onSelect={selectOnMap} />
            <h3 className="mt-7 text-lg font-semibold">Countries in this game</h3>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            <section className="move-panel mt-6 rounded border border-zinc-400 p-5" aria-label="Your move">
              <h2 className="text-xl font-semibold">Your next move</h2><p className="move-help">{game.phase === "action" ? "Choose your country, then a target. Attack an opponent or transfer soldiers to a country you own." : game.phase === "combat" ? "Roll to continue fighting, or stop to keep your remaining soldiers." : game.phase === "conquest" ? "Keep at least one soldier behind when you occupy the captured country." : "Choose one of your countries and place your new soldiers."}</p>
              {game.phase === "reinforcement" && <p className="mt-2">Place your {game.reinforcementsRemaining} reinforcements before taking an action.</p>}
              {(game.phase === "reinforcement" || game.phase === "action") && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <label>Your country
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

          </div>
          <section className="mt-8" aria-label="Game events">
            <h2 className="text-xl font-semibold">Latest moves</h2>
            <ol className="event-list mt-3 space-y-2" aria-live="polite">
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
      </fieldset>
      {error && <p role="alert" className="mt-5 rounded border border-red-600 p-3 text-red-700 ">{error}</p>}
    </main>
  );
}
