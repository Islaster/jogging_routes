import { createRoutesClient } from "../services/googleRoutes";
import { createElevationClient } from "../services/googleElevation";
import { planRoutes } from "../planner";
import type { RouteRequest } from "../types";

const apiKey = process.env.MAPS_KEY;
if (!apiKey) {
  console.error(
    "Missing MAPS_KEY. Run with: npx tsx --env-file=.env src/scripts/tryRoute.ts"
  );
  process.exit(1);
}

const deps = {
  routes: createRoutesClient({ apiKey }),
  elevation: createElevationClient(apiKey),
};

const request: RouteRequest = {
  start: { lat: 34.0522, lng: -118.2437 },
  miles: 5,
  terrain: "rolling",
  roads: "side-roads",
};

console.log(
  `Planning ${request.miles}mi ${request.terrain} / ${request.roads}...`
);

try {
  const results = await planRoutes(request, deps);

  if (!results.length) {
    console.log(
      "No routes returned — check the start point is near a road network."
    );
    process.exit(0);
  }

  results.forEach((r, i) => {
    console.log(`\n#${i + 1}  score ${r.score.toFixed(2)}`);
    console.log(
      `  distance   ${r.miles.toFixed(2)} mi (target ${request.miles})`
    );
    console.log(
      `  elevation  ${Math.round(r.gainFt)} ft  (${Math.round(
        r.ftPerMile
      )} ft/mi)`
    );
    console.log(`  quietness  ${(r.sideRoadRatio * 100).toFixed(0)}%`);
    console.log(
      `  breakdown  dist ${r.breakdown.distance.toFixed(2)} ` +
        `terrain ${r.breakdown.terrain.toFixed(
          2
        )} roads ${r.breakdown.roads.toFixed(2)}`
    );
  });

  console.log(`\nBest polyline:\n${results[0].polyline}`);
} catch (err) {
  console.error("Failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
