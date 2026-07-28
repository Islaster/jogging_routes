import { distancesFrom } from "./reachability";
import { isRunnable } from "./runnable";
import type { RoadGraph } from "../graph/RoadGraph";
import type { RoadPref } from "./types";
import { isTrail } from "./runnable";

export interface NetworkExtent {
  /** Edges of this kind anywhere in the fetched area. */
  nearbyMeters: number;
  /** Of those, the ones you could actually reach on foot from the start. */
  connectedMeters: number;
  farthestM: number;
}

/** How much of the requested kind of road exists, and how much connects here. */
export function measureNetwork(
  graph: RoadGraph,
  startNode: number,
  roads: RoadPref
): NetworkExtent {
  const distances = distancesFrom(graph, startNode, roads);

  let nearbyMeters = 0;
  let connectedMeters = 0;
  let farthestM = 0;

  for (const edge of graph.edges) {
    if (!isRunnable(edge, roads)) continue;
    nearbyMeters += edge.meters;

    const reach = Math.min(distances[edge.from], distances[edge.to]);
    if (reach === Infinity) continue;

    connectedMeters += edge.meters;
    if (reach > farthestM) farthestM = reach;
  }

  return { nearbyMeters, connectedMeters, farthestM };
}

/** Total length of this kind of road, ignoring whether it connects to anything. */
export function totalRunnableMeters(graph: RoadGraph, roads: RoadPref): number {
  let meters = 0;
  for (const edge of graph.edges) {
    if (isRunnable(edge, roads)) meters += edge.meters;
  }
  return meters;
}

export function measureTrails(
  graph: RoadGraph,
  startNode: number
): NetworkExtent {
  const distances = distancesFrom(graph, startNode, "trails");

  let nearbyMeters = 0;
  let connectedMeters = 0;
  let farthestM = 0;

  for (const edge of graph.edges) {
    if (!isTrail(edge)) continue;
    nearbyMeters += edge.meters;

    const reach = Math.min(distances[edge.from], distances[edge.to]);
    if (reach === Infinity) continue;

    connectedMeters += edge.meters;
    if (reach > farthestM) farthestM = reach;
  }

  return { nearbyMeters, connectedMeters, farthestM };
}
