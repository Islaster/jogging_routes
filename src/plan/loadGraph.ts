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
  let t = Date.now();
  const elements = await fetchRoadElements(center, radiusM);
  console.log(`    load: fetch ${Date.now() - t}ms`);

  t = Date.now();
  const graph = buildGraph(elements);
  console.log(`    load: build ${Date.now() - t}ms`);

  t = Date.now();
  attachElevation(graph, elevation);
  console.log(`    load: elevation ${Date.now() - t}ms`);

  return graph;
}
