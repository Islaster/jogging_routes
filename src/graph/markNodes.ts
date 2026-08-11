import { coordKey } from "./coordKey";
import type { RoadGraph } from "./RoadGraph";

/** Flag nodes OSM tags with a signal, crossing, or stop. */
export function markSignalized(
  graph: RoadGraph,
  signalKeys: Set<string>
): void {
  for (const node of graph.nodes) {
    node.signalized = signalKeys.has(coordKey(node.lat, node.lng));
  }
}

/** Flag nodes where a road too big to cross freely meets. */
export function markArterial(graph: RoadGraph): void {
  for (const node of graph.nodes) {
    node.arterial = node.edges.some((id) => !graph.edges[id].crossable);
  }
}

/** Flag nodes that are traffic lights. */
export function markStoplights(
  graph: RoadGraph,
  stoplightKeys: Set<string>
): void {
  const MAX_TRANSFER_M = 60;

  for (const node of graph.nodes) {
    if (!stoplightKeys.has(coordKey(node.lat, node.lng))) continue;

    if (node.edges.length >= 3) {
      node.stoplight = true; // tagged directly on the intersection
      continue;
    }

    // Approach post: the real light is the adjacent junction.
    for (const edgeId of node.edges) {
      const edge = graph.edges[edgeId];
      if (edge.meters > MAX_TRANSFER_M) continue;
      const neighbor = graph.nodes[graph.other(edgeId, node.id)];
      if (neighbor.edges.length >= 3) neighbor.stoplight = true;
    }
  }
}

/** Flag nodes where a fast road passes — its corners and crossings. */
export function markFastRoads(graph: RoadGraph): void {
  for (const node of graph.nodes) {
    node.fastRoad = node.edges.some((id) => graph.edges[id].fastRoad);
  }
}
