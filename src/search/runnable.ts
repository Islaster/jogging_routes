import type { GraphEdge } from "../graph/types";
import type { RoadPref } from "./types";

const TRAIL_TYPES = new Set(["path", "track", "bridleway"]);

/** A genuine trail — not a sidewalk or a paved park connector. */
export function isTrail(edge: GraphEdge): boolean {
  return TRAIL_TYPES.has(edge.type);
}

/**
 * Can this edge be run along?
 * trails: paths preferred, quiet streets allowed as connectors — pure
 *         trail networks are rarely connected end to end.
 */
export function isRunnable(edge: GraphEdge, roads: RoadPref): boolean {
  if (roads === "any") return true;
  if (roads === "trails") return isTrail(edge) || edge.crossable;
  return edge.crossable;
}
