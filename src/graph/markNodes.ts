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
