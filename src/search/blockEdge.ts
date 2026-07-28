import type { RoadGraph } from "../graph/RoadGraph";

/**
 * Mark an edge used, along with anything running alongside it.
 * Transitive by one hop: west sidewalk ∥ roadway ∥ east sidewalk, so using
 * either side of a street takes the whole street out.
 */
export function blockEdge(
  graph: RoadGraph,
  edgeId: number,
  used: Set<number>
): void {
  used.add(edgeId);

  for (const alongside of graph.parallel[edgeId] ?? []) {
    used.add(alongside);
    for (const opposite of graph.parallel[alongside] ?? []) {
      used.add(opposite);
    }
  }
}
