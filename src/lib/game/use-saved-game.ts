"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameAction, GameState } from "@/types/game";

interface SavedGameSummary {
  id: string;
  countryName: string;
  updatedAt: string;
  round: number;
  phase: GameState["phase"];
}

async function api<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    cache: "no-store",
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Could not load this game.");
  return data;
}

export function useSavedGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const [savedGames, setSavedGames] = useState<SavedGameSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoPlay, setAutoPlay] = useState(false);
  const [playbackDelay, setPlaybackDelay] = useState(700);
  const pending = useRef(false);

  const refreshList = useCallback(async () => {
    setListLoading(true);
    try { setSavedGames(await api<SavedGameSummary[]>("/api/games")); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load saved games."); }
    finally { setListLoading(false); }
  }, []);

  useEffect(() => {
    let active = true;
    api<SavedGameSummary[]>("/api/games").then((rows) => { if (active) setSavedGames(rows); })
      .catch(() => { if (active) setError("Could not load saved games. Use Refresh saved games to try again."); })
      .finally(() => { if (active) setListLoading(false); });
    return () => { active = false; };
  }, []);

  const change = useCallback(async (url: string, body?: unknown) => {
    // block a second click until the server confirms the first one was saved
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await api<GameState>(url, body);
      setGame(next);
      if (next.phase === "finished" || next.players.find((player) => player.id === next.currentPlayerId)?.kind === "human") setAutoPlay(false);
      return next;
    } catch (cause) {
      setAutoPlay(false);
      setError(cause instanceof Error ? cause.message : "Connection interrupted. Reload the saved game to check the last move.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }, []);

  const playNpc = useCallback(async () => {
    if (game) await change(`/api/games/${game.id}`, { revision: game.revision, npc: true });
  }, [game, change]);

  useEffect(() => {
    if (!autoPlay || busy || !game || game.phase === "finished" || game.players.find((player) => player.id === game.currentPlayerId)?.kind !== "npc") return;
    const timer = window.setTimeout(() => { void playNpc(); }, playbackDelay);
    return () => window.clearTimeout(timer);
  }, [autoPlay, busy, game, playNpc, playbackDelay]);

  async function start(selectedCountryId: string) {
    setAutoPlay(false);
    return change("/api/games", { selectedCountryId });
  }

  async function resume(id: string) {
    setAutoPlay(false);
    return change(`/api/games/${id}`);
  }

  async function play(action: GameAction) {
    if (game) await change(`/api/games/${game.id}`, { revision: game.revision, action });
  }

  function leave() {
    if (pending.current) return;
    setAutoPlay(false);
    setGame(null);
    setError("");
    void refreshList();
  }

  return { game, savedGames, listLoading, busy, error, autoPlay, setAutoPlay, playbackDelay, setPlaybackDelay, start, resume, play, playNpc, leave, refreshList };
}
