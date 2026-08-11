import type { LatLng } from "../types";
import type { RoadGraph } from "../graph/RoadGraph";

export type { RoadPref, Terrain } from "../types";
import type { RoadPref, Terrain } from "../types";

export interface Loop {
  path: LatLng[];
  meters: number;
  quietness: number;
  edgeIds: number[];
  shape?: "loop" | "out-and-back";
}

/** Everything a filter or weight needs to judge one candidate step. */
export interface StepContext {
  graph: RoadGraph;
  startNode: number;
  currentNode: number;
  previousEdge: number | undefined;
  /** Direction keys already traversed — one per sidewalk, not per street. */
  usedDirections: Set<number>;
  /** traveledM when each node was last visited — guards against micro-cycles. */
  lastVisitAtM: Map<number, number>;
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
  /** Compass bearing this walk was assigned to head toward. */
  outboundBearingDeg: number;
  avoidStoplights: boolean;
  lowTraffic: boolean;
}

/** One candidate step, with the geometry a filter or weight might want. */
export interface Step {
  edgeId: number;
  toNode: number;
  meters: number;
  turnDeg: number; // 0 = straight ahead
  isStraight: boolean;
}
