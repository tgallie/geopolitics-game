"use client";

// positions are matched to the generated artwork, on its original 2:1 canvas
const map = { width: 960, height: 480, regions: [{"name":"Argentina","center":[260,420]},{"name":"Australia","center":[810,390]},{"name":"Bangladesh","center":[702,245]},{"name":"Brazil","center":[285,340]},{"name":"Canada","center":[190,120]},{"name":"China","center":[735,205]},{"name":"Egypt","center":[540,245]},{"name":"Ethiopia","center":[560,300]},{"name":"France","center":[455,185]},{"name":"Germany","center":[477,171]},{"name":"India","center":[655,270]},{"name":"Indonesia","center":[760,333]},{"name":"Iran","center":[600,242]},{"name":"Italy","center":[485,200]},{"name":"Japan","center":[830,207]},{"name":"Kenya","center":[555,330]},{"name":"Mexico","center":[150,240]},{"name":"Nigeria","center":[445,290]},{"name":"Pakistan","center":[620,245]},{"name":"Philippines","center":[800,285]},{"name":"Russia","center":[715,120]},{"name":"Saudi Arabia","center":[565,270]},{"name":"South Africa","center":[475,407]},{"name":"South Korea","center":[814,204]},{"name":"Spain","center":[415,208]},{"name":"Switzerland","center":[465,188]},{"name":"Thailand","center":[715,280]},{"name":"Turkey","center":[530,205]},{"name":"United Arab Emirates","center":[590,274]},{"name":"United Kingdom","center":[413,155]},{"name":"United States of America","center":[175,195]},{"name":"Vietnam","center":[730,275]}] };
import type { GameState } from "@/types/game";

const npcColors = ["#b45309", "#7c3aed", "#b91c1c", "#047857", "#a21caf", "#9a3412", "#0f766e", "#a16207", "#be185d"];

interface WorldGameMapProps {
  game: Omit<GameState, "ownerUserId">;
  fromId: string;
  toId: string;
  onSelect?: (countryId: string) => void;
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

  function select(id: string) { onSelect?.(id); }

  return (
    <div className="overflow-x-auto border-4 border-slate-800 bg-sky-200 shadow-[8px_8px_0_#0f172a]">
      <svg viewBox={`0 0 ${map.width} ${map.height}`} className="block h-auto min-w-[720px] w-full" aria-label="World map showing countries in this game">
        <image href="/pixel-world-map-blocky.png" width="960" height="480" preserveAspectRatio="xMidYMid meet" />
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
            <g key={`count-${region.name}`} className={onSelect ? "cursor-pointer" : undefined} role={onSelect ? "button" : "img"} tabIndex={onSelect ? 0 : undefined}
              aria-label={`${onSelect ? "Select " : ""}${territory.country.name}: ${territory.soldiers} soldiers`}
              onClick={() => select(territory.country.id)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); select(territory.country.id); } }}>
              <rect x={region.center[0] - 10} y={region.center[1] - 10} width="20" height="20"
                fill={ownerColors.get(territory.ownerId)} stroke={territory.country.id === fromId || territory.country.id === toId ? "#facc15" : "#fff"} strokeWidth="2" className={animateBattle && latestBattle?.kind === "conquest" && territory.country.id === latestBattle.toCountryId ? "map-capture" : ""} />
              <text x={region.center[0]} y={region.center[1] + 4} textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" pointerEvents="none">{territory.soldiers}</text>
              <title>{territory.country.name}: {territory.soldiers} soldiers</title>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-t-4 border-slate-800 bg-white px-4 py-3 text-sm text-slate-900">
        <span className="flex items-center gap-2"><span className="inline-block h-4 w-4 bg-blue-700" />{onSelect ? "Your markers" : "Player markers"}</span>
        <span className="flex items-center gap-2"><span className="inline-block h-4 w-4 bg-amber-700" />NPC markers (colour shows owner)</span>
      </div>
      <p className="bg-white px-4 pb-3 text-xs text-slate-600">{onSelect ? "Select a square marker to choose a country. " : ""}Marker colours show ownership; the artwork keeps its original colours.</p>
    </div>
  );
}
