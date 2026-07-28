import { loadGraph } from "./loadGraph";
import { findStartNode } from "../search/startNode";
import { searchLoops } from "../search/searchLoops";
import { dedupeLoops } from "./dedupeLoops";
import { diversify } from "./diversify";
import { enrichLoop } from "./enrichLoop";
import type { RouteRequest, ScoredRoute } from "../types";
import type { PlannerDeps } from "./deps";
import { sectorOf } from "./sectorOf";
import { measureNetwork, totalRunnableMeters } from "../search/measureNetwork";
import {
  noNetworkNearby,
  networkTooSmall,
  noLoopFound,
} from "./explainFailure";
import { measureTrails } from "../search/measureNetwork";
import { distancesFrom } from "../search/reachability";

const MILES_TO_M = 1609.344;
const MIN_FETCH_RADIUS_M = 800;

export interface PlanOptions {
  count?: number;
  attempts?: number;
  tolerance?: number;
}

export async function planRoutes(
  request: RouteRequest,
  deps: PlannerDeps,
  options: PlanOptions = {}
): Promise<ScoredRoute[]> {
  const { count = 5, attempts = 400, tolerance = 0.12 } = options;
  const targetM = request.miles * MILES_TO_M;
  const radiusM = Math.max(MIN_FETCH_RADIUS_M, targetM / 3);

  const elevation = await deps.elevationGrid(request.start, radiusM);
  const graph = await loadGraph(request.start, radiusM, elevation);
  const trailEdges = graph.edges.filter((e) => e.quietness >= 0.95);
  const trailNodes = new Set(trailEdges.flatMap((e) => [e.from, e.to]));
  const degrees = new Map<number, number>();
  for (const node of trailNodes) {
    const d = graph.nodes[node].edges.filter(
      (id) => graph.edges[id].quietness >= 0.95
    ).length;
    degrees.set(d, (degrees.get(d) ?? 0) + 1);
  }
  console.log(
    `  trail nodes by degree: ${[...degrees]
      .sort((a, b) => a[0] - b[0])
      .map(([d, n]) => `${d}:${n}`)
      .join(" ")}`
  );

  const startNode = findStartNode(graph, request.start, request.roads);
  if (startNode === null) {
    throw new Error(
      noNetworkNearby(request, totalRunnableMeters(graph, request.roads))
    );
  }

  const node = graph.nodes[startNode];
  const distances = distancesFrom(graph, startNode, request.roads);
  let reachable = 0;
  for (const d of distances) if (d !== Infinity) reachable++;

  console.log(
    `  start node ${startNode} at ${node.lat.toFixed(5)},${node.lng.toFixed(
      5
    )} — ` +
      `${node.edges.length} edges, reaches ${reachable}/${graph.nodes.length} nodes`
  );
  const extent = measureNetwork(graph, startNode, request.roads);

  if (request.roads === "trails") {
    const trails = measureTrails(graph, startNode);
    console.log(
      `  trails: ${Math.round(trails.connectedMeters)}m reachable ` +
        `of ${Math.round(trails.nearbyMeters)}m nearby`
    );
    if (trails.connectedMeters < targetM * 0.25) {
      throw new Error(noNetworkNearby(request, trails.nearbyMeters));
    }
  }

  if (extent.connectedMeters < targetM * 1.2) {
    throw new Error(networkTooSmall(request, extent));
  }
  console.log(
    `  ${request.roads}: ${Math.round(extent.connectedMeters)}m connected ` +
      `of ${Math.round(extent.nearbyMeters)}m nearby, reaching ${Math.round(
        extent.farthestM
      )}m out`
  );

  if (extent.connectedMeters < targetM * 1.2) {
    throw new Error(networkTooSmall(request, extent));
  }

  const found = searchLoops(
    graph,
    startNode,
    targetM,
    request.roads,
    request.terrain,
    {
      attempts,
      tolerance,
    }
  );
  if (!found.length) {
    throw new Error(noLoopFound(request));
  }

  const distinct = dedupeLoops(found);
  const enriched = distinct.map((loop) => enrichLoop(loop, request, elevation));
  const picked = diversify(
    distinct,
    request.start,
    count,
    (loop) => enriched[distinct.indexOf(loop)].score
  );

  picked.forEach((loop, i) => {
    const sector = sectorOf(loop, request.start, 8);
    const enrichedLoop = enriched[distinct.indexOf(loop)];
    console.log(
      `  route ${i}: ${sector * 45}° — ${enrichedLoop.miles.toFixed(2)}mi, ` +
        `${Math.round(enrichedLoop.gainFt)}ft, quiet ${(
          loop.quietness * 100
        ).toFixed(0)}%`
    );
  });

  return picked
    .map((loop) => enriched[distinct.indexOf(loop)])
    .sort((a, b) => b.score - a.score);
}
