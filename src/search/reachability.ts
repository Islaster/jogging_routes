import { MinHeap } from "./MinHeap";
import { isRunnable } from "./runnable";
import type { RoadGraph } from "../graph/RoadGraph";
import type { RoadPref } from "./types";

/**
 * Real-meter distance from `origin` to every node, over runnable edges.
 *
 * lowTraffic excludes fast-road edges entirely — running along them is
 * banned outright, so nothing beyond them counts as reachable that way.
 *
 * avoidStoplights deliberately does NOT sever reachability: under crossing
 * semantics a runner passes any light by turning the corner, so lights
 * barely disconnect the network. Enforcement lives in the step filter and
 * pathHome, where turn context exists. The parameter stays so call sites
 * read symmetrically and the policy has one place to change.
 */
export function distancesFrom(
  graph: RoadGraph,
  origin: number,
  roads: RoadPref,
  avoidStoplights = false,
  lowTraffic = false
): Float64Array {
  void avoidStoplights; // see note above

  const distances = new Float64Array(graph.nodes.length).fill(Infinity);
  distances[origin] = 0;

  const queue = new MinHeap();
  queue.push(origin, 0);

  while (queue.size) {
    const [node, dist] = queue.pop()!;
    if (dist > distances[node]) continue;

    for (const edgeId of graph.nodes[node].edges) {
      const edge = graph.edges[edgeId];
      if (!isRunnable(edge, roads)) continue;
      if (lowTraffic && edge.fastRoad) continue;

      const next = graph.other(edgeId, node);
      const candidate = dist + edge.meters;
      if (candidate < distances[next]) {
        distances[next] = candidate;
        queue.push(next, candidate);
      }
    }
  }

  return distances;
}
