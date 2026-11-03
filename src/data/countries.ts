import type { Country } from "../types/game.ts";
import { soldiersForPopulation } from "../lib/game/rules.ts";

// Selected 2026 country population estimates. Keep these values stable for saved games.
const populationYear = 2026;
const populationSource = "https://www.worldometers.info/world-population/population-by-country/";

const countryData = [
  { id: "ARGENTINA", name: "Argentina", population: 46_003_734 },
  { id: "AU", name: "Australia", population: 27_227_096 },
  { id: "BANGLADESH", name: "Bangladesh", population: 177_818_044 },
  { id: "BR", name: "Brazil", population: 213_562_666 },
  { id: "CA", name: "Canada", population: 40_467_728 },
  { id: "CN", name: "China", population: 1_412_914_089 },
  { id: "EGYPT", name: "Egypt", population: 120_101_175 },
  { id: "ETHIOPIA", name: "Ethiopia", population: 138_902_185 },
  { id: "FR", name: "France", population: 66_746_401 },
  { id: "DE", name: "Germany", population: 83_644_258 },
  { id: "IN", name: "India", population: 1_476_625_576 },
  { id: "INDONESIA", name: "Indonesia", population: 287_886_782 },
  { id: "IRAN", name: "Iran", population: 93_168_497 },
  { id: "ITALY", name: "Italy", population: 58_926_166 },
  { id: "JP", name: "Japan", population: 122_427_731 },
  { id: "KENYA", name: "Kenya", population: 58_636_412 },
  { id: "MEXICO", name: "Mexico", population: 132_997_658 },
  { id: "NIGERIA", name: "Nigeria", population: 242_431_832 },
  { id: "PAKISTAN", name: "Pakistan", population: 259_299_791 },
  { id: "PHILIPPINES", name: "Philippines", population: 117_724_471 },
  { id: "RUSSIA", name: "Russia", population: 143_394_458 },
  { id: "SAUDI-ARABIA", name: "Saudi Arabia", population: 35_165_787 },
  { id: "ZA", name: "South Africa", population: 65_453_084 },
  { id: "SOUTH-KOREA", name: "South Korea", population: 51_600_388 },
  { id: "SPAIN", name: "Spain", population: 47_850_793 },
  { id: "CH", name: "Switzerland", population: 9_007_798 },
  { id: "THAILAND", name: "Thailand", population: 71_559_614 },
  { id: "TURKEY", name: "Turkey", population: 87_926_082 },
  { id: "UNITED-ARAB-EMIRATES", name: "United Arab Emirates", population: 11_574_682 },
  { id: "GB", name: "United Kingdom", population: 69_931_528 },
  { id: "US", name: "United States", population: 349_035_494 },
  { id: "VIETNAM", name: "Vietnam", population: 102_177_431 },
];

export const countries: Country[] = countryData.map((country) => ({
  ...country,
  populationYear,
  populationSource,
  baseSoldierValue: soldiersForPopulation(country.population),
}));
