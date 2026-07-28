import type { LatLng } from "../types";
import type { RoadGraph } from "../graph/RoadGraph";
import type { Loop } from "./types";

/**
 * Edge sequence → a Loop. Returns null if the edges don't actually connect
 * or don't return to the start — a guard against drawing lines across nothing.
 */
export function assembleLoop(
  graph: RoadGraph,
  startNode: number,
  edgeIds: number[]
): Loop | null {
  if (!edgeIds.length) return null;

  const path: LatLng[] = [];
  let node = startNode;
  let meters = 0;
  let quietnessSum = 0;

  for (const edgeId of edgeIds) {
    const edge = graph.edges[edgeId];
    if (edge.from !== node && edge.to !== node) return null;

    const geometry = graph.orientedGeometry(edgeId, node);
    if (!path.length) path.push(geometry[0]);
    for (let i = 1; i < geometry.length; i++) path.push(geometry[i]);

    meters += edge.meters;
    quietnessSum += edge.meters * edge.quietness;
    node = graph.other(edgeId, node);
  }

  if (node !== startNode || meters === 0) return null;

  return { path, meters, quietness: quietnessSum / meters, edgeIds };
}
