import type { GameEvent } from "@/types/game";

export function BattleCommentary({ event }: { event: GameEvent }) {
  if (!event.commentary) return null;
  return <div className="battle-commentary mt-3 border-l-4 border-teal-700 bg-teal-50 p-3 text-slate-900">
    <p className="font-semibold">{event.commentary.source === "ai" ? "AI battle commentary" : "Battle summary · AI unavailable"}</p>
    <p className="mt-2">{event.commentary.text}</p>
  </div>;
}
