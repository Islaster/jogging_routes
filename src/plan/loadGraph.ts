import { buildGraph } from "../graph/buildGraph";
import { attachElevation } from "../graph/attachElevation";
import { fetchRoadElements } from "../services/overpass";
import type { LatLng } from "../types";
import type { RoadGraph } from "../graph/RoadGraph";
import type { ElevationSource } from "../graph/attachElevation";

/** Road network around a point, with gradients attached. */
export async function loadGraph(
  center: LatLng,
  radiusM: number,
  elevation: ElevationSource
): Promise<RoadGraph> {
  const elements = await fetchRoadElements(center, radiusM);
  const graph = buildGraph(elements);
  attachElevation(graph, elevation);
  return graph;
}
