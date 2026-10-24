import type { Country } from "@/types/game";

import { soldiersForPopulation } from "@/lib/game/rules";

export const countries: Country[] = [
    {
        id: "ZA",
        name: "South Africa",
        population: 60_000_000,
        populationYear: 2025,
        populationSource: "Practice data — replace before release",
        baseSoldierValue: soldiersForPopulation(60_000_000),
    },

    {
        id: "CH",
        name: "Switzerland",
        population: 8_000_000,
        populationYear: 2025,
        populationSource: "Practice data — replace before release",
        baseSoldierValue: soldiersForPopulation(8_000_000),
    },
];
