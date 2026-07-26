import { destination, mulberry32, MILES_TO_M } from "./geo";
import type { LatLng } from "./types";

export interface LoopCandidate {
  waypoints: LatLng[];
  seed: number;
  radius: number;
}

export function radiusForTarget(
  targetMeters: number,
  k: number,
  detourFactor: number
): number {
  const chordPerimeterPerRadius = 2 * k * Math.sin(Math.PI / k);
  return targetMeters / (detourFactor * chordPerimeterPerRadius);
}

/**
 * Ring of waypoints around `start`. Squash + jitter keeps routes from
 * all looking like the same circle.
 */
export function generateLoop(
  start: LatLng,
  miles: number,
  seed: number,
  opts: { waypointCount?: number; detourFactor?: number } = {}
): LoopCandidate {
  const k = opts.waypointCount ?? 4;
  const detour = opts.detourFactor ?? 1.3;
  const radius = radiusForTarget(miles * MILES_TO_M, k, detour);

  const rng = mulberry32(seed);
  const startBearing = rng() * 360;
  const squash = 0.7 + rng() * 0.6; // 0.7–1.3 → ovals, not circles
  const squashAxis = rng() * 180;

  const waypoints = Array.from({ length: k }, (_, i) => {
    const bearing = (startBearing + (360 / k) * i) % 360;
    const offAxis = Math.cos(((bearing - squashAxis) * Math.PI) / 180);
    const r = radius * (1 + (squash - 1) * offAxis) * (0.9 + rng() * 0.2);
    return destination(start, bearing, r);
  });

  return { waypoints, seed, radius };
}

export function generateCandidates(
  start: LatLng,
  miles: number,
  count: number,
  detourFactor = 1.3
): LoopCandidate[] {
  return Array.from({ length: count }, (_, i) =>
    generateLoop(start, miles, i * 7919 + 13, { detourFactor })
  );
}
