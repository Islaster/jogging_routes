import type { LatLng } from "../types";

export type RoadPref = "side-roads" | "any" | "trails";
export type Terrain = "flat" | "rolling" | "hilly";

export interface Loop {
  path: LatLng[];
  meters: number;
  quietness: number;
  edgeIds: number[];
  shape?: "loop" | "out-and-back";
}

/** Everything a filter or weight needs to judge one candidate step. */
export interface StepContext {
  graph: import("../graph/RoadGraph").RoadGraph;
  startNode: number;
  currentNode: number;
  previousEdge: number | undefined;
  usedEdges: Set<number>;
  traveledM: number;
  maxTotalM: number;
  legLengthM: number;
  legTargetM: number;
  sweepDeg: number;
  lastBearingDeg: number | null;
  turnDirection: 1 | -1;
  homeDistances: Float64Array;
  roads: RoadPref;
  terrain: Terrain;
  targetM: number;
  outboundBearingDeg: number;
}

/** One candidate step, with the geometry a filter or weight might want. */
export interface Step {
  edgeId: number;
  toNode: number;
  meters: number;
  turnDeg: number; // 0 = straight ahead
  isStraight: boolean;
}
