import { parseWays, parseSignalNodes } from "./parseWays";
import { findJunctions } from "./findJunctions";
import { splitAtJunctions } from "./splitAtJunctions";
import {
  markSignalized,
  markArterial,
  markStoplights,
  markFastRoads,
} from "./markNodes";
import { findParallels } from "./findParallels";
import { RoadGraph } from "./RoadGraph";
import { parseStoplightNodes } from "./parseWays";

/** Overpass elements → routable graph. */
export function buildGraph(elements: any[]): RoadGraph {
  const mark = (label: string, since: number) => {
    console.log(`    build: ${label} ${Date.now() - since}ms`);
    return Date.now();
  };

  let t = Date.now();
  const ways = parseWays(elements);
  const signalKeys = parseSignalNodes(elements);
  const stoplightKeys = parseStoplightNodes(elements);
  t = mark("parse", t);

  const junctions = findJunctions(ways);
  for (const key of stoplightKeys) junctions.add(key);
  t = mark("junctions", t);

  const specs = splitAtJunctions(ways, junctions);
  t = mark("split", t);

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
  t = mark("edges", t);

  markSignalized(graph, signalKeys);
  markArterial(graph);
  markStoplights(graph, stoplightKeys);
  markFastRoads(graph);
  console.log(
    `  ${graph.edges.filter((e) => e.fastRoad).length} fast-road edges`
  );
  t = mark("mark", t);

  graph.parallel = findParallels(graph);
  mark("parallels", t);
  const pairs = graph.parallel.reduce((n, list) => n + list.length, 0);
  const twoSided = graph.edges.filter((e) => e.sidewalkSides === 2).length;
  const calmBonus = graph.edges.filter(
    (e) => e.loopable && e.sidewalkSides !== 2
  ).length;
  console.log(
    `  graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges, ` +
      `${twoSided} two-sided, ${calmBonus} calm-street bonus, ${pairs} parallel pairs`
  );

  return graph;
}
