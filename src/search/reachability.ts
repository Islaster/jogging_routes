import { MinHeap } from "./MinHeap";
import { isRunnable } from "./runnable";
import type { RoadGraph } from "../graph/RoadGraph";
import type { RoadPref } from "./types";

/** Shortest real distance from `origin` to every node, over runnable edges. */
export function distancesFrom(
  graph: RoadGraph,
  origin: number,
  roads: RoadPref
): Float64Array {
  const distance = new Float64Array(graph.nodes.length).fill(Infinity);
  distance[origin] = 0;

  const queue = new MinHeap();
  queue.push(origin, 0);

  while (queue.size) {
    const [node, dist] = queue.pop()!;
    if (dist > distance[node]) continue;

    for (const edgeId of graph.nodes[node].edges) {
      const edge = graph.edges[edgeId];
      if (!isRunnable(edge, roads)) continue;

      const next = graph.other(edgeId, node);
      const candidate = dist + edge.meters;
      if (candidate < distance[next]) {
        distance[next] = candidate;
        queue.push(next, candidate);
      }
    }
  }

  return distance;
}
