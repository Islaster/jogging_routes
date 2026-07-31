import { haversine } from "../geo/distance";
import { distancesFrom } from "./reachability";
import { isRunnable } from "./runnable";
import type { LatLng } from "../types";
import type { RoadGraph } from "../graph/RoadGraph";
import type { RoadPref } from "./types";

const MIN_JUNCTION_DEGREE = 3;

/**
 * Nearest node you can actually run from — a junction connected to the bulk
 * of the network, not a driveway stub that happens to be closest.
 */
export function findStartNode(
  graph: RoadGraph,
  point: LatLng,
  roads: RoadPref,
  maxMeters = 500
): number | null {
  const candidates = nearbyRunnableNodes(graph, point, roads, maxMeters);
  if (!candidates.length) return null;

  const minimumReach = Math.max(20, graph.nodes.length * 0.1);

  const junctions = candidates.filter(
    (id) => runnableDegree(graph, id, roads) >= MIN_JUNCTION_DEGREE
  );

  for (const id of junctions) {
    if (reachCount(graph, id, roads) >= minimumReach) return id;
  }
  for (const id of candidates) {
    if (reachCount(graph, id, roads) >= minimumReach) return id;
  }

  return candidates[0];
}

/** Runnable nodes within range, nearest first. */
function nearbyRunnableNodes(
  graph: RoadGraph,
  point: LatLng,
  roads: RoadPref,
  maxMeters: number
): number[] {
  const found: Array<{ id: number; distance: number }> = [];

  for (const node of graph.nodes) {
    if (!node.edges.some((id) => isRunnable(graph.edges[id], roads))) continue;

    const distance = haversine(point, { lat: node.lat, lng: node.lng });
    if (distance <= maxMeters) found.push({ id: node.id, distance });
  }

  return found.sort((a, b) => a.distance - b.distance).map((n) => n.id);
}

/** How many ways out of this node are runnable. */
function runnableDegree(
  graph: RoadGraph,
  nodeId: number,
  roads: RoadPref
): number {
  return graph.nodes[nodeId].edges.filter((id) =>
    isRunnable(graph.edges[id], roads)
  ).length;
}

function reachCount(graph: RoadGraph, from: number, roads: RoadPref): number {
  const distances = distancesFrom(graph, from, roads);
  let count = 0;
  for (const d of distances) if (d !== Infinity) count++;
  return count;
}
