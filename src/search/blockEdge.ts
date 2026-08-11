import { directionKey } from "./direction";
import type { RoadGraph } from "../graph/RoadGraph";

/**
 * Consume one pass of an edge. Loopable streets — two certified sidewalks,
 * or a posted ≤20 mph limit — spend one direction per pass; anything less
 * certain spends both at once, the old edge-once rule.
 *
 * Separately-mapped parallel sidewalks lose both directions: they are the
 * same physical concrete as one of the centerline's sides.
 */
export function blockDirection(
  graph: RoadGraph,
  edgeId: number,
  fromNode: number,
  used: Set<number>
): void {
  if (graph.edges[edgeId].loopable) {
    used.add(directionKey(graph, edgeId, fromNode));
  } else {
    used.add(edgeId * 2);
    used.add(edgeId * 2 + 1);
  }

  for (const parallel of graph.parallel[edgeId] ?? []) {
    used.add(parallel * 2);
    used.add(parallel * 2 + 1);
    for (const opposite of graph.parallel[parallel] ?? []) {
      used.add(opposite * 2);
      used.add(opposite * 2 + 1);
    }
  }
}
