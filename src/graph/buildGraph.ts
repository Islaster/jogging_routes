import { parseWays, parseSignalNodes } from "./parseWays";
import { findJunctions } from "./findJunctions";
import { splitAtJunctions } from "./splitAtJunctions";
import { markSignalized, markArterial } from "./markNodes";
import { findParallels } from "./findParallels";
import { RoadGraph } from "./RoadGraph";

/** Overpass elements → routable graph. */
export function buildGraph(elements: any[]): RoadGraph {
  const ways = parseWays(elements);
  const signalKeys = parseSignalNodes(elements);
  const junctions = findJunctions(ways);
  const specs = splitAtJunctions(ways, junctions);

  const graph = new RoadGraph();
  for (const spec of specs) {
    const first = spec.geometry[0];
    const last = spec.geometry[spec.geometry.length - 1];
    graph.addEdge(
      graph.internNode(first.lat, first.lng),
      graph.internNode(last.lat, last.lng),
      spec
    );
  }

  markSignalized(graph, signalKeys);
  markArterial(graph);
  graph.parallel = findParallels(graph);
  const pairs = graph.parallel.reduce((n, list) => n + list.length, 0);
  console.log(
    `  graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ${pairs} parallel pairs`
  );

  return graph;
}
