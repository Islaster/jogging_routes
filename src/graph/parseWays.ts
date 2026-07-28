import {
  isJoggable,
  laneCount,
  quietnessOf,
  isCrossable,
} from "./classifyRoad";
import { coordKey } from "./coordKey";
import type { ParsedWay } from "./types";

/** Overpass way elements → classified ways. */
export function parseWays(elements: any[]): ParsedWay[] {
  const ways: ParsedWay[] = [];

  for (const element of elements) {
    if (element.type !== "way") continue;
    const tags = element.tags ?? {};
    const geometry = element.geometry;
    if (!isJoggable(tags) || !geometry || geometry.length < 2) continue;

    const type = tags.highway;
    const lanes = laneCount(tags);

    ways.push({
      type,
      lanes,
      quietness: quietnessOf(tags),
      crossable: isCrossable(type, lanes),
      geometry: geometry.map((g: any) => ({ lat: g.lat, lng: g.lon })),
    });
  }

  return ways;
}

/** Overpass node elements → coordinate keys of signals and crossings. */
export function parseSignalNodes(elements: any[]): Set<string> {
  const keys = new Set<string>();
  for (const element of elements) {
    if (element.type !== "node" || !element.tags?.highway) continue;
    keys.add(coordKey(element.lat, element.lon));
  }
  return keys;
}
