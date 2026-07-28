import { MinHeap } from "./MinHeap";
import { isRunnable } from "./runnable";
import type { RoadGraph } from "../graph/RoadGraph";
import type { RoadPref } from "./types";

export interface HomePath {
  edgeIds: number[];
  meters: number;
}

/** Shortest route back to `destination` using only unused runnable edges. */
export function pathHome(
  graph: RoadGraph,
  origin: number,
  destination: number,
  forbidden: Set<number>,
  roads: RoadPref,
  edgeCost: (edgeId: number) => number = () => 1
): HomePath | null {
  const count = graph.nodes.length;
  const distance = new Float64Array(count).fill(Infinity);
  const cameFromEdge = new Int32Array(count).fill(-1);
  const cameFromNode = new Int32Array(count).fill(-1);

  distance[origin] = 0;
  const queue = new MinHeap();
  queue.push(origin, 0);

  while (queue.size) {
    const [node, dist] = queue.pop()!;
    if (dist > distance[node]) continue;
    if (node === destination) break;

    for (const edgeId of graph.nodes[node].edges) {
      if (forbidden.has(edgeId)) continue;
      const edge = graph.edges[edgeId];
      if (!isRunnable(edge, roads)) continue;

      const next = graph.other(edgeId, node);
      const candidate = dist + edge.meters * edgeCost(edgeId);
      if (candidate < distance[next]) {
        distance[next] = candidate;
        cameFromEdge[next] = edgeId;
        cameFromNode[next] = node;
        queue.push(next, candidate);
      }
    }
  }

  if (distance[destination] === Infinity) return null;
  return retrace(graph, cameFromEdge, cameFromNode, origin, destination);
}

function retrace(
  graph: RoadGraph,
  cameFromEdge: Int32Array,
  cameFromNode: Int32Array,
  origin: number,
  destination: number
): HomePath | null {
  const edgeIds: number[] = [];
  let meters = 0;
  let node = destination;

  while (node !== origin) {
    const edgeId = cameFromEdge[node];
    if (edgeId < 0) return null;
    edgeIds.push(edgeId);
    meters += graph.edges[edgeId].meters;
    node = cameFromNode[node];
  }

  edgeIds.reverse();
  return { edgeIds, meters };
}
