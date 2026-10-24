import type { Country } from "@/types/game";
import { soldiersForPopulation } from "@/lib/game/rules";

// keep the year and source here so i don't repeat them for every country
const populationYear = 2026;
const populationSource =
    "https://www.worldometers.info/world-population/population-by-country/";

// these are the countries available while we build the game
const countryData = [
    { id: "ZA", name: "South Africa", population: 65_453_084 },
    { id: "CH", name: "Switzerland", population: 9_007_798 },
    { id: "IN", name: "India", population: 1_476_625_576 },
    { id: "CN", name: "China", population: 1_412_914_089 },
    { id: "US", name: "United States", population: 349_035_494 },
    { id: "BR", name: "Brazil", population: 213_562_666 },
    { id: "JP", name: "Japan", population: 122_427_731 },
    { id: "DE", name: "Germany", population: 83_644_258 },
    { id: "GB", name: "United Kingdom", population: 69_931_528 },
    { id: "FR", name: "France", population: 66_746_401 },
    { id: "CA", name: "Canada", population: 40_467_728 },
    { id: "AU", name: "Australia", population: 27_227_096 },
];

// add the source details and calculate soldiers for each country
export const countries: Country[] = countryData.map((country) => ({
    ...country,
    populationYear,
    populationSource,
    baseSoldierValue: soldiersForPopulation(country.population),
}));