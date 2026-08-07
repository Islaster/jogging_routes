import { candidateSteps } from "./candidateSteps";
import { partitionSteps, OUT_AND_BACK_FILTERS } from "./stepFilters";
import { weightOf } from "./stepWeights";
import { pickStep } from "./pickStep";
import { blockDirection } from "./blockEdge";
import type { LatLng } from "../types";
import type { RoadGraph } from "../graph/RoadGraph";
import type { Loop, RoadPref, Step, StepContext, Terrain } from "./types";

const MAX_STEPS = 500;

export interface OutAndBackOptions {
  graph: RoadGraph;
  startNode: number;
  targetM: number;
  tolerance: number;
  homeDistances: Float64Array;
  random: () => number;
  roads: RoadPref;
  terrain: Terrain;
  outboundBearingDeg: number;
  avoidStoplights: boolean;
}

/**
 * Run out to the halfway point, then return the same way.
 * How most trails are actually run — fragmented networks rarely close a loop.
 */
export function walkOutAndBack(options: OutAndBackOptions): Loop | null {
  const { graph, startNode, targetM, tolerance, random } = options;

  const turnaroundM = targetM / 2;
  const minOutboundM = turnaroundM * (1 - tolerance);
  const maxOutboundM = turnaroundM * (1 + tolerance);

  const state = initialState(options, maxOutboundM);

  for (let step = 0; step < MAX_STEPS; step++) {
    if (state.traveledM >= minOutboundM) {
      return mirror(graph, startNode, state.edgeIds, state.traveledM);
    }

    const chosen = chooseNextStep(state, random, maxOutboundM);
    if (!chosen) {
      // Dead end — fine if we came far enough, otherwise this walk failed.
      return state.traveledM >= minOutboundM
        ? mirror(graph, startNode, state.edgeIds, state.traveledM)
        : null;
    }

    advance(state, chosen, graph);
  }

  return null;
}

type WalkState = StepContext & { edgeIds: number[] };

function initialState(
  options: OutAndBackOptions,
  maxOutboundM: number
): WalkState {
  const { graph, startNode, targetM, homeDistances, random, roads, terrain } =
    options;

  return {
    graph,
    startNode,
    currentNode: startNode,
    previousEdge: undefined,
    usedDirections: new Set<number>(),
    edgeIds: [],
    traveledM: 0,
    maxTotalM: maxOutboundM,
    legLengthM: 0,
    legTargetM: Infinity, // trails: follow the path, don't force turns
    sweepDeg: 0,
    lastBearingDeg: null,
    turnDirection: random() < 0.5 ? 1 : -1,
    homeDistances,
    roads,
    terrain,
    targetM,
    outboundBearingDeg: options.outboundBearingDeg,
    avoidStoplights: options.avoidStoplights,
    lastVisitAtM: new Map([[startNode, 0]]),
  };
}

function chooseNextStep(
  state: WalkState,
  random: () => number,
  maxOutboundM: number
): Step | null {
  const all = candidateSteps(
    state.graph,
    state.currentNode,
    state.previousEdge
  );

  // Don't overshoot the turnaround, and don't immediately backtrack.
  const viable = all.filter(
    (step) =>
      state.traveledM + step.meters <= maxOutboundM &&
      step.edgeId !== state.previousEdge
  );

  const { legal } = partitionSteps(state, viable, OUT_AND_BACK_FILTERS);
  if (!legal.length) return null;

  const weights = legal.map(
    (step) => weightOf(state, step) * (0.3 + random() * 1.7)
  );
  return pickStep(legal, weights, random);
}

function advance(state: WalkState, step: Step, graph: RoadGraph): void {
  blockDirection(graph, step.edgeId, state.currentNode, state.usedDirections);

  state.edgeIds.push(step.edgeId);
  state.previousEdge = step.edgeId;
  state.traveledM += step.meters;
  state.currentNode = step.toNode;
  state.lastVisitAtM.set(state.currentNode, state.traveledM);
}

/** Outbound path plus its reverse — there and back. */
function mirror(
  graph: RoadGraph,
  startNode: number,
  edgeIds: number[],
  outboundM: number
): Loop | null {
  if (!edgeIds.length) return null;

  const outbound: LatLng[] = [];
  let node = startNode;
  let quietnessSum = 0;

  for (const edgeId of edgeIds) {
    const edge = graph.edges[edgeId];
    if (edge.from !== node && edge.to !== node) return null;

    const geometry = graph.orientedGeometry(edgeId, node);
    if (!outbound.length) outbound.push(geometry[0]);
    for (let i = 1; i < geometry.length; i++) outbound.push(geometry[i]);

    quietnessSum += edge.meters * edge.quietness;
    node = graph.other(edgeId, node);
  }

  const back = [...outbound].reverse().slice(1);

  return {
    path: [...outbound, ...back],
    meters: outboundM * 2,
    quietness: quietnessSum / outboundM,
    edgeIds: [...edgeIds, ...[...edgeIds].reverse()],
    shape: "out-and-back",
  };
}
