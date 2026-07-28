import type { GraphEdge } from "../graph/types";
import type { RoadPref } from "./types";

/** A genuine trail or path, as opposed to a street. */
export function isTrail(edge: GraphEdge): boolean {
  return edge.quietness >= 0.95;
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
