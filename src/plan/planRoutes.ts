import { loadGraph } from "./loadGraph";
import { findStartNode } from "../search/startNode";
import { searchLoops } from "../search/searchLoops";
import { dedupeLoops } from "./dedupeLoops";
import { diversify } from "./diversify";
import { filterByTerrain } from "./filterByTerrain";
import { enrichLoop } from "./enrichLoop";
import { sectorOf } from "./sectorOf";
import {
  measureNetwork,
  measureTrails,
  totalRunnableMeters,
} from "../search/measureNetwork";
import {
  noNetworkNearby,
  networkTooSmall,
  noLoopFound,
} from "./explainFailure";
import type { RoadGraph } from "../graph/RoadGraph";
import type { RouteRequest, ScoredRoute } from "../types";
import type { PlannerDeps } from "./deps";

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

  const t0 = Date.now();
  const elevation = await deps.elevationGrid(request.start, radiusM);
  const t1 = Date.now();
  const graph = await loadGraph(request.start, radiusM, elevation);
  {
    const lights = graph.nodes.filter((n) => n.stoplight);
    console.log(`  ${lights.length} flagged stoplights:`);
    for (const n of lights) {
      console.log(
        `    ${n.lat.toFixed(5)},${n.lng.toFixed(5)} degree ${n.edges.length}`
      );
    }
  }
  const t2 = Date.now();
  logGrades(graph);

  const startNode = findStartNode(
    graph,
    request.start,
    request.roads,
    500,
    (id) => !request.avoidStoplights || !graph.nodes[id].stoplight
  );
  if (startNode === null) {
    throw new Error(
      noNetworkNearby(request, totalRunnableMeters(graph, request.roads))
    );
  }

  const node = graph.nodes[startNode];
  console.log(
    `  start node ${startNode} at ${node.lat.toFixed(5)},${node.lng.toFixed(
      5
    )} — ` + `${node.edges.length} edges`
  );

  if (request.roads === "trails") {
    const trails = measureTrails(graph, startNode);
    console.log(
      `  trails: ${Math.round(trails.connectedMeters)}m reachable ` +
        `of ${Math.round(trails.nearbyMeters)}m nearby`
    );
    if (trails.connectedMeters < targetM * 0.6) {
      throw new Error(noNetworkNearby(request, trails.nearbyMeters));
    }
  }

  const extent = measureNetwork(graph, startNode, request.roads);
  console.log(
    `  ${request.roads}: ${Math.round(extent.connectedMeters)}m connected ` +
      `of ${Math.round(extent.nearbyMeters)}m nearby`
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
    { attempts, tolerance, avoidStoplights: request.avoidStoplights }
  );
  const t3 = Date.now();
  console.log(
    `  timing: elevation ${t1 - t0}ms, graph ${t2 - t1}ms, search ${t3 - t2}ms`
  );
  if (!found.length) {
    throw new Error(noLoopFound(request));
  }

  const distinct = dedupeLoops(found);
  const scored = new Map(
    distinct.map((loop) => [loop, enrichLoop(loop, request, elevation)])
  );

  const gains = [...scored.values()]
    .map((r) => r.ftPerMile)
    .sort((a, b) => a - b);
  const pick = (p: number) =>
    Math.round(gains[Math.floor((gains.length - 1) * p)]);
  console.log(
    `  ft/mi across ${gains.length} loops: ` +
      `min ${pick(0)} p25 ${pick(0.25)} median ${pick(0.5)} p75 ${pick(
        0.75
      )} max ${pick(1)}`
  );

  const terrainMatched = [...scored.values()].some(
    (route) => route.breakdown.terrain >= 0.5
  );
  if (!terrainMatched) {
    console.log(
      `  no ${request.terrain} routes here — these average ${pick(0.5)} ft/mi`
    );
  }

  const terrainPool = filterByTerrain(distinct, scored, count);
  console.log(
    `  terrain pool: ${terrainPool.length} of ${distinct.length} loops`
  );

  const picked = diversify(
    terrainPool,
    request.start,
    count,
    (loop) => scored.get(loop)!.score
  );

  logPicked(picked, request, scored);

  return picked
    .map((loop) => scored.get(loop)!)
    .sort((a, b) => b.score - a.score);
}

/** Are grades varied enough for the terrain preference to act on? */
function logGrades(graph: RoadGraph): void {
  const grades = graph.edges.map((e) => e.grade).sort((a, b) => a - b);
  if (!grades.length) return;

  const at = (p: number) => grades[Math.floor((grades.length - 1) * p)];
  console.log(
    `  grades: median ${at(0.5).toFixed(4)} ` +
      `p90 ${at(0.9).toFixed(4)} p99 ${at(0.99).toFixed(4)}`
  );
}

function logPicked(
  picked: import("../search/types").Loop[],
  request: RouteRequest,
  scored: Map<import("../search/types").Loop, ScoredRoute>
): void {
  picked.forEach((loop, i) => {
    const route = scored.get(loop)!;
    console.log(
      `  route ${i}: ${sectorOf(loop, request.start, 8) * 45}° — ` +
        `${route.miles.toFixed(2)}mi, ${Math.round(route.gainFt)}ft, ` +
        `quiet ${(loop.quietness * 100).toFixed(0)}%`
    );
  });
}
