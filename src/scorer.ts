import type { RouteRequest, Terrain } from "./types";

const TERRAIN_BANDS: Record<Terrain, [number, number]> = {
  flat: [0, 35], // ft of gain per mile
  rolling: [35, 90],
  hilly: [90, 400],
};

const WEIGHTS = { distance: 0.5, terrain: 0.3, roads: 0.2 };

export function scoreDistance(
  actualMiles: number,
  targetMiles: number
): number {
  const err = Math.abs(actualMiles - targetMiles) / targetMiles;
  return Math.max(0, 1 - err * 4); // 25% off → 0
}

export function scoreTerrain(ftPerMile: number, terrain: Terrain): number {
  const [lo, hi] = TERRAIN_BANDS[terrain];
  if (ftPerMile >= lo && ftPerMile <= hi) return 1;
  const dist = ftPerMile < lo ? lo - ftPerMile : ftPerMile - hi;
  return Math.max(0, 1 - dist / 60);
}

export function scoreRoads(ratio: number, pref: RouteRequest["roads"]): number {
  if (pref === "any") return 1;
  if (pref === "trails") return ratio >= 0.95 ? 1 : Math.max(0, ratio - 0.3);
  return Math.min(1, ratio / 0.85); // side-roads: 0.85+ is full marks
}

export function combine(b: {
  distance: number;
  terrain: number;
  roads: number;
}) {
  return (
    b.distance * WEIGHTS.distance +
    b.terrain * WEIGHTS.terrain +
    b.roads * WEIGHTS.roads
  );
}
