"use client";

import { useState } from "react";
import { countries } from "@/data/countries";

export default function Home() {
  // keep track of the country i picked
  const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // use the id to find the full country details
  const selectedCountry = countries.find(
    (country) => country.id === selectedCountryId,
  );

  function selectCountry(countryId: string) {
    setSelectedCountryId(countryId);
    // if i change my country, i need to confirm it again
    setIsConfirmed(false);
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
          <p>Starting soldiers: {selectedCountry.baseSoldierValue}</p>
          <p className="mt-2 text-sm">These population figures are practice data.</p>
        </section>
      )}

      {/* i cannot confirm until i have picked a country */}
      <button
        type="button"
        disabled={!selectedCountry || isConfirmed}
        onClick={() => setIsConfirmed(true)}
        className="mt-6 rounded bg-blue-600 px-4 py-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isConfirmed ? "Country confirmed" : "Confirm country"}
      </button>

      <p className="mt-4" role="status">
        {isConfirmed && selectedCountry
          ? `You chose ${selectedCountry.name}. Opponent setup comes next.`
          : ""}
      </p>
    </main>
  );
}
