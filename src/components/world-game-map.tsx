"use client";

import map from "@/data/world-map-paths.json";
import type { GameState } from "@/types/game";

const npcColors = ["#b45309", "#7c3aed", "#b91c1c", "#047857", "#a21caf", "#9a3412", "#0f766e", "#a16207", "#be185d"];

interface WorldGameMapProps {
  game: GameState;
  fromId: string;
  toId: string;
  onSelect: (countryId: string) => void;
}

export function WorldGameMap({ game, fromId, toId, onSelect }: WorldGameMapProps) {
  const territories = new Map(game.territories.map((territory) => [territory.country.name === "United States" ? "United States of America" : territory.country.name, territory]));
  const ownerColors = new Map(game.players.map((player, index) => [player.id, player.kind === "human" ? "#1d4ed8" : npcColors[(index - 1 + npcColors.length) % npcColors.length]]));
  const latestBattle = [...game.events].reverse().find((event) =>
    (event.kind === "attack" || event.kind === "roll" || event.kind === "conquest") && event.fromCountryId && event.toCountryId,
  );
  const lastEvent = game.events.at(-1);
  const animateBattle = latestBattle && lastEvent && latestBattle.sequence >= lastEvent.sequence - 1;
  const fromRegion = map.regions.find((region) => territories.get(region.name)?.country.id === latestBattle?.fromCountryId);
  const toRegion = map.regions.find((region) => territories.get(region.name)?.country.id === latestBattle?.toCountryId);

  function select(id: string) { onSelect(id); }

  return (
    <div className="overflow-x-auto border-4 border-slate-800 bg-sky-200 shadow-[8px_8px_0_#0f172a]">
      <svg viewBox={`0 0 ${map.width} ${map.height}`} className="block h-auto min-w-[720px] w-full" aria-label="Interactive world map showing countries in this game">
        <defs>
          <pattern id="ocean-tiles" width="24" height="24" patternUnits="userSpaceOnUse">
            <rect width="24" height="24" fill="#b9e6f7" />
            <rect width="12" height="12" fill="#9bd8ee" />
            <rect x="12" y="12" width="12" height="12" fill="#9bd8ee" />
          </pattern>
        </defs>
        <rect width={map.width} height={map.height} fill="url(#ocean-tiles)" />
        {map.regions.map((region) => {
          const territory = territories.get(region.name);
          const color = territory ? ownerColors.get(territory.ownerId) : "#d8e4d5";
          const chosen = territory && (territory.country.id === fromId || territory.country.id === toId);
          const capturing = animateBattle && latestBattle?.kind === "conquest" && territory?.country.id === latestBattle.toCountryId;
          return (
            <path key={region.name} d={region.path} fill={color} stroke={chosen ? "#facc15" : "#334155"}
              strokeWidth={chosen ? 3 : 0.8} className={`${territory ? "cursor-pointer hover:brightness-125" : ""} ${capturing ? "map-capture" : ""}`}
              role={territory ? "button" : undefined} tabIndex={territory ? 0 : undefined}
              aria-label={territory ? `${territory.country.name}, ${territory.soldiers} soldiers, owned by ${game.players.find((player) => player.id === territory.ownerId)?.name}` : undefined}
              onClick={territory ? () => select(territory.country.id) : undefined}
              onKeyDown={territory ? (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(territory.country.id); } } : undefined}>
              <title>{territory ? `${territory.country.name}: ${territory.soldiers} soldiers` : region.name}</title>
            </path>
          );
        })}
        {animateBattle && fromRegion && toRegion && (
          <g key={latestBattle.sequence} className="pointer-events-none">
            <line x1={fromRegion.center[0]} y1={fromRegion.center[1]} x2={toRegion.center[0]} y2={toRegion.center[1]}
              stroke={latestBattle.kind === "conquest" ? "#facc15" : "#ef4444"} strokeWidth="4" strokeDasharray="10 6" className="map-conflict" />
            <rect x={toRegion.center[0] - 8} y={toRegion.center[1] - 8} width="16" height="16"
              fill={latestBattle.kind === "conquest" ? "#facc15" : "#ef4444"} className="map-impact" />
          </g>
        )}
        {map.regions.filter((region) => territories.has(region.name)).map((region) => {
          const territory = territories.get(region.name)!;
          return (
            <g key={`count-${region.name}`} className="cursor-pointer" role="button" tabIndex={0}
              aria-label={`Select ${territory.country.name}`}
              onClick={() => select(territory.country.id)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(territory.country.id); } }}>
              <rect x={region.center[0] - 10} y={region.center[1] - 10} width="20" height="20"
                fill={ownerColors.get(territory.ownerId)} stroke="#fff" strokeWidth="2" />
              <text x={region.center[0]} y={region.center[1] + 4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" pointerEvents="none">{territory.soldiers}</text>
              <title>{territory.country.name}: {territory.soldiers} soldiers</title>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t-4 border-slate-800 bg-white px-4 py-3 text-sm text-slate-900">
        <span className="flex items-center gap-2"><span className="inline-block h-4 w-4 bg-blue-700" />Your countries</span>
        <span className="flex items-center gap-2"><span className="inline-block h-4 w-4 bg-amber-700" />NPC countries (each has its own colour)</span>
        <span className="flex items-center gap-2"><span className="inline-block h-4 w-4 bg-slate-200" />Outside this game</span>
      </div>
      <p className="bg-white px-4 pb-3 text-xs text-slate-600">Country outlines adapted from <a className="underline" href="https://www.naturalearthdata.com/downloads/50m-cultural-vectors/" target="_blank" rel="noreferrer">Natural Earth</a> through <a className="underline" href="https://github.com/topojson/world-atlas" target="_blank" rel="noreferrer">World Atlas</a>.</p>
    </div>
  );
}
