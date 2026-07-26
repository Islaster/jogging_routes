import { destination, MILES_TO_M } from "@core/geo";
import type { PlannerApi, RouteView } from "./types";

function syntheticLoop(
  start: { lat: number; lng: number },
  miles: number,
  wobble: number,
  offsetBearing: number
) {
  const radius = (miles * MILES_TO_M) / (2 * Math.PI);
  const center = destination(start, offsetBearing, radius); // start lies ON this circle
  const backBearing = (offsetBearing + 180) % 360; // from center toward start

  const pts = Array.from({ length: 73 }, (_, i) => {
    const bearing = (backBearing + (360 / 72) * i) % 360;
    const w = wobble * Math.sin((i / 72) * Math.PI * 4); // zero at both ends
    return destination(center, bearing, radius * (1 + w));
  });

  pts[0] = start; // exact, no float drift
  pts[72] = start; // closes the loop
  return pts;
}

export function createFixtureApi(delayMs = 600): PlannerApi {
  return {
    async plan(req) {
      await new Promise((r) => setTimeout(r, delayMs));

      const presets = [
        {
          bearing: 40,
          wobble: 0.12,
          miles: req.miles * 0.98,
          gain: 240,
          ratio: 0.91,
          score: 0.88,
        },
        {
          bearing: 160,
          wobble: 0.25,
          miles: req.miles * 1.07,
          gain: 410,
          ratio: 0.78,
          score: 0.74,
        },
        {
          bearing: 280,
          wobble: 0.05,
          miles: req.miles * 0.89,
          gain: 95,
          ratio: 0.94,
          score: 0.69,
        },
      ];

      return presets.map(
        (p, i): RouteView => ({
          id: `fixture-${i}`,
          path: syntheticLoop(req.start, p.miles, p.wobble, p.bearing),
          miles: p.miles,
          gainFt: p.gain,
          ftPerMile: p.gain / p.miles,
          sideRoadRatio: p.ratio,
          score: p.score,
          breakdown: { distance: 0.9, terrain: 0.8, roads: p.ratio },
        })
      );
    },
  };
}
