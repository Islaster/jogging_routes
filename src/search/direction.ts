import type { RoadGraph } from "../graph/RoadGraph";

/**
 * Unique key for traversing an edge in one direction — one sidewalk of
 * the street. The reverse traversal is the other sidewalk.
 */
export function directionKey(
  graph: RoadGraph,
  edgeId: number,
  fromNode: number
): number {
  return edgeId * 2 + (graph.edges[edgeId].from === fromNode ? 0 : 1);
}
