import { haversine } from "../geo/distance";
import { bearingBetween, bearingDelta } from "../geo/bearing";
import { candidateSteps } from "./candidateSteps";
import { partitionSteps } from "./stepFilters";
import { weightOf } from "./stepWeights";
import { pickStep } from "./pickStep";
import { blockEdge } from "./blockEdge";
import { tryClose } from "./tryClose";
import { recordStep, type WalkTrace } from "./trace";
import type { RoadGraph } from "../graph/RoadGraph";
import type { Loop, RoadPref, Step, StepContext, Terrain } from "./types";

const MAX_STEPS = 500;

export interface WalkOptions {
  graph: RoadGraph;
  startNode: number;
  targetM: number;
  tolerance: number;
  homeDistances: Float64Array;
  random: () => number;
  roads: RoadPref;
  terrain: Terrain;
  /** Compass direction this walk should head out toward. */
  outboundBearingDeg: number;
  trace?: WalkTrace;
}

/** One randomized closed trail from the start, or null if it didn't work out. */
export function walkOnce(options: WalkOptions): Loop | null {
  const {
    graph,
    startNode,
    targetM,
    tolerance,
    homeDistances,
    random,
    roads,
    trace,
  } = options;

  const homeCost = makeHomeCost(random);
  const minTotalM = targetM * (1 - tolerance);
  const maxTotalM = targetM * (1 + tolerance);
  const state = initialState(options, maxTotalM);

  for (let step = 0; step < MAX_STEPS; step++) {
    if (shouldTryClosing(state, minTotalM, homeDistances, step)) {
      const result = tryClose(
        graph,
        startNode,
        state.currentNode,
        state.edgeIds,
        state.usedEdges,
        state.traveledM,
        minTotalM,
        maxTotalM,
        roads,
        homeCost
      );
      if (result.status === "closed") {
        if (trace)
          trace.outcome = `closed at ${Math.round(state.traveledM)}m walked`;
        return result.loop;
      }
      if (result.status === "overshot") {
        if (trace)
          trace.outcome = `overshot at ${Math.round(state.traveledM)}m`;
        return null;
      }
    }

    const chosen = chooseNextStep(state, random, trace);
    if (!chosen) {
      if (trace)
        trace.outcome = `stuck at ${Math.round(
          state.traveledM
        )}m, no legal steps`;
      return null;
    }

    advance(state, chosen, graph);
  }

  if (trace) trace.outcome = "hit step limit";
  return null;
}

type WalkState = StepContext & { edgeIds: number[] };

function initialState(options: WalkOptions, maxTotalM: number): WalkState {
  const { graph, startNode, targetM, homeDistances, random, roads, terrain } =
    options;

  return {
    graph,
    startNode,
    currentNode: startNode,
    previousEdge: undefined,
    usedEdges: new Set<number>(),
    edgeIds: [],
    traveledM: 0,
    maxTotalM,
    legLengthM: 0,
    legTargetM: chooseLegTarget(targetM, random),
    sweepDeg: 0,
    lastBearingDeg: null,
    turnDirection: random() < 0.5 ? 1 : -1,
    homeDistances,
    roads,
    terrain,
    targetM,
    outboundBearingDeg: options.outboundBearingDeg,
  };
}

/** How far this walk runs before turning — randomized so loops differ in shape. */
function chooseLegTarget(targetM: number, random: () => number): number {
  return 120 + random() * Math.min(600, targetM * 0.35);
}

function shouldTryClosing(
  state: WalkState,
  minTotalM: number,
  homeDistances: Float64Array,
  step: number
): boolean {
  if (step <= 2) return false;
  return state.traveledM + homeDistances[state.currentNode] >= minTotalM * 0.75;
}

function chooseNextStep(
  state: WalkState,
  random: () => number,
  trace?: WalkTrace
): Step | null {
  const all = candidateSteps(
    state.graph,
    state.currentNode,
    state.previousEdge
  );
  const { legal, rejections } = partitionSteps(state, all);
  if (!legal.length) return null;

  const weights = legal.map(
    (step) => weightOf(state, step) * (0.3 + random() * 1.7)
  );
  const chosen = pickStep(legal, weights, random);

  if (chosen && trace) recordStep(trace, state, all, legal, chosen, rejections);
  return chosen;
}

function advance(state: WalkState, step: Step, graph: RoadGraph): void {
  blockEdge(graph, step.edgeId, state.usedEdges);

  state.edgeIds.push(step.edgeId);
  state.previousEdge = step.edgeId;
  state.traveledM += step.meters;
  state.legLengthM = step.isStraight
    ? state.legLengthM + step.meters
    : step.meters;
  state.currentNode = step.toNode;

  updateSweep(state, graph);
}

/** Track how far around the start we've turned. */
function updateSweep(state: WalkState, graph: RoadGraph): void {
  const start = graph.nodes[state.startNode];
  const here = graph.nodes[state.currentNode];
  const startPoint = { lat: start.lat, lng: start.lng };
  const herePoint = { lat: here.lat, lng: here.lng };

  if (haversine(startPoint, herePoint) <= 40) return;

  const bearing = bearingBetween(startPoint, herePoint);
  if (state.lastBearingDeg !== null) {
    state.sweepDeg += bearingDelta(state.lastBearingDeg, bearing);
  }
  state.lastBearingDeg = bearing;
}

/** Per-walk cost jitter so identical situations don't pick identical routes home. */
function makeHomeCost(random: () => number): (edgeId: number) => number {
  const offsets = new Map<number, number>();
  return (edgeId) => {
    let value = offsets.get(edgeId);
    if (value === undefined) {
      value = 0.6 + random() * 0.8;
      offsets.set(edgeId, value);
    }
    return value;
  };
}
