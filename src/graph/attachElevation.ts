import type { LatLng } from "../types";
import type { RoadGraph } from "./RoadGraph";

export interface ElevationSource {
  at(point: LatLng): number;
}

/** Give every edge its mean absolute gradient. */
export function attachElevation(
  graph: RoadGraph,
  elevation: ElevationSource
): void {
  for (const edge of graph.edges) {
    let change = 0;
    let previous = elevation.at(edge.geometry[0]);

    for (let i = 1; i < edge.geometry.length; i++) {
      const current = elevation.at(edge.geometry[i]);
      change += Math.abs(current - previous);
      previous = current;
    }

    edge.grade = edge.meters > 0 ? change / edge.meters : 0;
  }
}
