import { MinHeap } from "./MinHeap";
import { isRunnable } from "./runnable";
import { directionKey } from "./direction";
import { bearingBetween, bearingDelta } from "../geo/bearing";
import type { RoadGraph } from "../graph/RoadGraph";
import type { RoadPref } from "./types";

const STRAIGHT_DEG = 30;

export interface HomePath {
  edgeIds: number[];
  meters: number;
}

/**
 * Shortest route back to `destination` over runnable edges whose direction
 * hasn't been spent — coming home on the other sidewalk is legal where the
 * data certifies it. Obeys the same transition rules as the outbound walk:
 * no straight-through at unsignalized arterial nodes, and none at
 * stoplights when avoiding them.
 */
export function pathHome(
  graph: RoadGraph,
  origin: number,
  destination: number,
  forbiddenDirections: Set<number>,
  roads: RoadPref,
  edgeCost: (edgeId: number) => number = () => 1,
  avoidStoplights = false
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

    const here = graph.nodes[node];
    const previousEdge = cameFromEdge[node];

    for (const edgeId of graph.nodes[node].edges) {
      if (forbiddenDirections.has(directionKey(graph, edgeId, node))) continue;
      const edge = graph.edges[edgeId];
      if (!isRunnable(edge, roads)) continue;

      const next = graph.other(edgeId, node);

      if (
        previousEdge >= 0 &&
        blocksStraightThrough(
          graph,
          here,
          previousEdge,
          edge,
          next,
          avoidStoplights
        )
      ) {
        continue;
      }

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

/** Would continuing onto this edge mean going straight through a node we mustn't? */
function blocksStraightThrough(
  graph: RoadGraph,
  here: RoadGraph["nodes"][number],
  previousEdge: number,
  edge: RoadGraph["edges"][number],
  next: number,
  avoidStoplights: boolean
): boolean {
  const crossingArterial =
    here.arterial &&
    !here.signalized &&
    graph.edges[previousEdge].crossable &&
    edge.crossable;
  const waitingAtLight = avoidStoplights && here.stoplight;

  if (!crossingArterial && !waitingAtLight) return false;

  const from = graph.nodes[graph.other(previousEdge, here.id)];
  const toward = graph.nodes[next];
  const delta = Math.abs(
    bearingDelta(bearingBetween(from, here), bearingBetween(here, toward))
  );
  return delta < STRAIGHT_DEG;
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
