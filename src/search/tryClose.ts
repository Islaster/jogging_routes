import { assembleLoop } from "./assembleLoop";
import { pathHome } from "./pathHome";
import type { RoadGraph } from "../graph/RoadGraph";
import type { Loop, RoadPref } from "./types";

export type CloseResult =
  | { status: "closed"; loop: Loop }
  | { status: "overshot" }
  | { status: "keep-walking" };

/**
 * Can the walk finish here? Checks the REAL legal path home — spent
 * directions are blocked, so it can be much longer than the shortest path.
 */
export function tryClose(
  graph: RoadGraph,
  startNode: number,
  currentNode: number,
  edgeIds: number[],
  usedDirections: Set<number>,
  traveledM: number,
  minTotalM: number,
  maxTotalM: number,
  roads: RoadPref,
  edgeCost?: (edgeId: number) => number,
  avoidStoplights = false
): CloseResult {
  const home = pathHome(
    graph,
    currentNode,
    startNode,
    usedDirections,
    roads,
    edgeCost,
    avoidStoplights
  );
  if (!home) return { status: "keep-walking" };

  const total = traveledM + home.meters;
  if (total > maxTotalM) return { status: "overshot" };
  if (total < minTotalM) return { status: "keep-walking" };

  const loop = assembleLoop(graph, startNode, [...edgeIds, ...home.edgeIds]);
  return loop ? { status: "closed", loop } : { status: "keep-walking" };
}
