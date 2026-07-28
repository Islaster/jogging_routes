import { coordKey } from "./coordKey";
import type { ParsedWay } from "./types";

/** Coordinates shared by two or more ways — the real intersections. */
export function findJunctions(ways: ParsedWay[]): Set<string> {
  const useCount = new Map<string, number>();

  for (const way of ways) {
    for (const point of way.geometry) {
      const key = coordKey(point.lat, point.lng);
      useCount.set(key, (useCount.get(key) ?? 0) + 1);
    }
  }

  const junctions = new Set<string>();
  for (const [key, count] of useCount) {
    if (count > 1) junctions.add(key);
  }
  return junctions;
}
