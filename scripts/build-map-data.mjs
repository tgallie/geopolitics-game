import { readFileSync, writeFileSync } from "node:fs";
import { geoEquirectangular, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import topology from "world-atlas/countries-50m.json" with { type: "json" };

// Turn Natural Earth boundaries into a local, blocky map asset for the game.
const width = 960;
const height = 520;
const grid = 3;
const countries = feature(topology, topology.objects.countries).features
  .filter((country) => country.properties.name !== "Antarctica");
const projection = geoEquirectangular()
  .fitExtent([[12, 12], [width - 12, height - 12]], { type: "FeatureCollection", features: countries })
  .precision(3);

class BlockPath {
  path = "";
  x = 0;
  y = 0;

  snap(value) { return Math.round(value / grid) * grid; }
  moveTo(x, y) {
    this.x = this.snap(x);
    this.y = this.snap(y);
    this.path += `M${this.x},${this.y}`;
  }
  lineTo(x, y) {
    const nextX = this.snap(x);
    const nextY = this.snap(y);
    if (nextX !== this.x) this.path += `H${nextX}`;
    if (nextY !== this.y) this.path += `V${nextY}`;
    this.x = nextX;
    this.y = nextY;
  }
  closePath() { this.path += "Z"; }
  arc() { throw new Error("Country polygons should not contain arcs."); }
}

const regions = countries.map((country) => {
  const context = new BlockPath();
  const path = geoPath(projection, context);
  path(country);
  const [x, y] = geoPath(projection).centroid(country);
  return {
    name: country.properties.name,
    path: context.path,
    center: [Math.round(x), Math.round(y)],
  };
});

if (!regions.some((region) => region.name === "South Africa") || regions.length < 200) {
  throw new Error("Map generation failed: expected world country regions.");
}
const availableNames = [...readFileSync("src/data/countries.ts", "utf8").matchAll(/name: "([^"]+)"/g)]
  .map((match) => match[1] === "United States" ? "United States of America" : match[1]);
if (availableNames.length !== 32 || availableNames.some((name) => !regions.some((region) => region.name === name))) {
  throw new Error("Every available country must have a matching map region.");
}
writeFileSync("src/data/world-map-paths.json", JSON.stringify({ width, height, regions }));
console.log(`Wrote ${regions.length} geographic regions.`);
