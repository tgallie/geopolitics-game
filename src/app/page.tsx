"use client";

import type { Country } from "@/types/game";
import { useState } from "react";
import { countries } from "@/data/countries";

export default function Home() {
  // keep track of the country i picked
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
    // keep the opponents picked for this game
  const [opponents, setOpponents] = useState<Country[]>([]);

  // use the id to find the full country details
  const selectedCountry = countries.find(
    (country) => country.id === selectedCountryId,
  );

    // leave my country out of the list of possible opponents
    const availableOpponents = countries.filter(
        (country) => country.id !== selectedCountryId,
    );

  function selectCountry(countryId: string) {
    setSelectedCountryId(countryId);
    // if i change my country, i need to confirm it again
    setIsConfirmed(false);
    }

    function confirmCountry() {
        if (!selectedCountry || availableOpponents.length < 9) {
            return;
        }

        // copy the list so i don't change the original
        const shuffled = [...availableOpponents];

        // shuffle by swapping each country with a random one
        for (let i = shuffled.length - 1; i > 0; i--) {
            const randomIndex = Math.floor(Math.random() * (i + 1));

            [shuffled[i], shuffled[randomIndex]] = [
                shuffled[randomIndex],
                shuffled[i],
            ];
        }

        // take the first nine countries from the shuffled list
        setOpponents(shuffled.slice(0, 9));
        setIsConfirmed(true);
    }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Choose your country</h1>
      <p className="mt-2">Pick the country you want to play as.</p>

      {/* show a button for each country in the list */}
      <ul className="mt-6 space-y-3">
        {countries.map((country) => (
          <li key={country.id}>
            <button
              type="button"
              onClick={() => selectCountry(country.id)}
              aria-pressed={selectedCountryId === country.id}
              className={`rounded border px-4 py-3 ${
                selectedCountryId === country.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-gray-400"
              }`}
            >
              {country.name} — {country.baseSoldierValue} soldiers
            </button>
          </li>
        ))}
      </ul>

      {/* only show the details once i have picked a country */}
      {selectedCountry && (
        <section className="mt-6 rounded border border-gray-400 p-4">
          <h2 className="text-xl font-semibold">{selectedCountry.name}</h2>
          <p>Population: {selectedCountry.population.toLocaleString("en-ZA")}</p>
        < p > Starting soldiers: { selectedCountry.baseSoldierValue } </p>
        < p > Possible opponents: { availableOpponents.length } </p>
        < p className = "mt-2 text-sm" >Population estimates: Worldometer, 2026.</p>
        </section>
      )}

      {/* i cannot confirm until i have picked a country */}
      <button
        type="button"
        onClick = { confirmCountry }
        disabled = {
          !selectedCountry || isConfirmed || availableOpponents.length < 9
        }
        className="mt-6 rounded bg-blue-600 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isConfirmed ? "Country confirmed" : "Confirm country"}
        </button>

        {/* show the opponents picked for this game */ }
        {
            isConfirmed && (
                <section className="mt-6" >
                    <h2 className="text-xl font-semibold" > Your opponents </h2>

                        < ul className = "mt-3 space-y-2" >
                        {
                            opponents.map((country) => (
                                <li key= { country.id } >
                                { country.name } — { country.baseSoldierValue } soldiers
                            </li>
                            ))
                        }
                            </ul>
                            </section>
        )
        }

      <p className="mt-4" role="status">
        {isConfirmed && selectedCountry
          ? `You chose ${selectedCountry.name}. Your nine opponents are ready.`
          : ""}
      </p>
    </main>
  );
}
