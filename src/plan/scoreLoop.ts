import type { Loop } from "../search/types";
import type { RouteRequest, Terrain } from "../types";

export interface Breakdown {
  distance: number;
  terrain: number;
  roads: number;
}

const TERRAIN_BANDS: Record<Exclude<Terrain, "any">, [number, number]> = {
  flat: [0, 35],
  rolling: [35, 90],
  hilly: [90, 400],
};

/** How well does this loop match what was asked for? Each part 0..1. */
export function scoreLoop(
  loop: Loop,
  request: RouteRequest,
  miles: number,
  ftPerMile: number
): Breakdown {
  return {
    distance: scoreDistance(miles, request.miles),
    terrain: scoreTerrain(ftPerMile, request.terrain),
    roads: loop.quietness,
  };
}

function scoreDistance(actual: number, target: number): number {
  const error = Math.abs(actual - target) / target;
  return Math.max(0, 1 - error * 4);
}

function scoreTerrain(ftPerMile: number, terrain: Terrain): number {
  if (terrain === "any") return 1; // unconstrained: every loop matches equally
  const [low, high] = TERRAIN_BANDS[terrain];
  if (ftPerMile >= low && ftPerMile <= high) return 1;
  const distance = ftPerMile < low ? low - ftPerMile : ftPerMile - high;
  return Math.max(0, 1 - distance / 60);
}
