import {
  isJoggable,
  laneCount,
  quietnessOf,
  isCrossable,
  sidewalkSides,
  isFastRoad,
  isCalmStreet,
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

    const sides = sidewalkSides(tags);
    ways.push({
      type,
      lanes,
      quietness: quietnessOf(tags),
      crossable: isCrossable(type, lanes),
      sidewalkSides: sides,
      loopable: sides === 2 || isCalmStreet(tags),
      fastRoad: isFastRoad(tags),
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

/** Nodes that are real traffic lights — where a runner has to stop and wait. */
export function parseStoplightNodes(elements: any[]): Set<string> {
  const keys = new Set<string>();
  for (const element of elements) {
    if (element.type !== "node") continue;
    const tags = element.tags ?? {};
    const isLight =
      tags.highway === "traffic_signals" ||
      (tags.highway === "crossing" && tags.crossing === "traffic_signals");
    if (isLight) keys.add(coordKey(element.lat, element.lon));
  }
  return keys;
}
