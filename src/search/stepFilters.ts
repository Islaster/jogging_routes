import { bearingBetween, bearingDelta } from "../geo/bearing";
import { directionKey } from "./direction";
import { isRunnable } from "./runnable";
import type { Step, StepContext } from "./types";

export type StepFilter = (ctx: StepContext, step: Step) => boolean;

/** Junction slivers form tiny cycles around traffic islands. Passing through
 *  is fine; lapping is not — a real block loop here is 500m+. */
const MIN_REVISIT_GAP_M = 200;

export const noTinyLoops: StepFilter = (ctx, step) => {
  const lastVisit = ctx.lastVisitAtM.get(step.toNode);
  if (lastVisit === undefined) return true;
  return ctx.traveledM + step.meters - lastVisit >= MIN_REVISIT_GAP_M;
};

/**
 * One sidewalk once: an edge may be traversed once per direction when the
 * data certifies two sidewalks. `blockDirection` spends both keys at once
 * for uncertain streets, so this stays a pure lookup.
 */
export const notReused: StepFilter = (ctx, step) =>
  !ctx.usedDirections.has(
    directionKey(ctx.graph, step.edgeId, ctx.currentNode)
  );

/** Only streets matching the road preference. */
export const isAllowedRoad: StepFilter = (ctx, step) =>
  isRunnable(ctx.graph.edges[step.edgeId], ctx.roads);

/** Leave enough budget to get home, not just to take this step. */
export const withinBudget: StepFilter = (ctx, step) =>
  ctx.traveledM + step.meters + ctx.homeDistances[step.toNode] <= ctx.maxTotalM;

/** The far end must be somewhere we could still get home from. */
export const canReachHome: StepFilter = (ctx, step) =>
  ctx.homeDistances[step.toNode] !== Infinity;

/**
 * Don't step somewhere with no way onward. The edge being stepped along
 * only counts as a way back when the data certifies its second sidewalk —
 * on uncertain streets, blockDirection spends both directions at once,
 * so the reverse we can see now won't exist after we arrive.
 */
export const hasOnwardMove: StepFilter = (ctx, step) => {
  if (step.toNode === ctx.startNode) return true;
  return ctx.graph.nodes[step.toNode].edges.some((id) => {
    if (!isRunnable(ctx.graph.edges[id], ctx.roads)) return false;
    if (id === step.edgeId && !ctx.graph.edges[id].loopable) {
      return false;
    }
    return !ctx.usedDirections.has(directionKey(ctx.graph, id, step.toNode));
  });
};

/**
 * Crossing a big street means going straight through where it meets ours,
 * away from any signal. Turning the corner is always fine.
 */
export const legalCrossing: StepFilter = (ctx, step) => {
  const node = ctx.graph.nodes[ctx.currentNode];
  if (!node.arterial || node.signalized) return true;
  if (!step.isStraight) return true;
  if (ctx.previousEdge === undefined) return true;
  return !ctx.graph.edges[ctx.previousEdge].crossable;
};

/**
 * A light blocks crossing, not presence. Going straight through means
 * crossing the street it governs — that's the wait. Turning the corner
 * never enters the roadway.
 */
export const avoidsStoplights: StepFilter = (ctx, step) => {
  if (!ctx.avoidStoplights) return true;
  if (!ctx.graph.nodes[ctx.currentNode].stoplight) return true;
  return !step.isStraight;
};

/**
 * The opening steps must actually head the assigned way — as a weight this
 * loses to randomness and every walk drifts into the same corridor. Skipped
 * when the node offers too few choices for a direction to be meaningful.
 */
export const startsOutward: StepFilter = (ctx, step) => {
  if (ctx.traveledM > ctx.targetM * 0.2) return true;

  const options = ctx.graph.nodes[ctx.currentNode].edges.filter(
    (id) =>
      isRunnable(ctx.graph.edges[id], ctx.roads) &&
      !ctx.usedDirections.has(directionKey(ctx.graph, id, ctx.currentNode))
  ).length;
  if (options <= 2) return true;

  const start = ctx.graph.nodes[ctx.startNode];
  const destination = ctx.graph.nodes[step.toNode];
  const bearing = bearingBetween(
    { lat: start.lat, lng: start.lng },
    { lat: destination.lat, lng: destination.lng }
  );

  return Math.abs(bearingDelta(ctx.outboundBearingDeg, bearing)) <= 75;
};

/**
 * Low-traffic mode: never run along a fast road and never cross one —
 * signalized or not. Turning at its corner stays legal; the corner is
 * where the quiet street ends, not where the danger is.
 */
export const avoidsFastRoads: StepFilter = (ctx, step) => {
  if (!ctx.lowTraffic) return true;
  if (ctx.graph.edges[step.edgeId].fastRoad) return false;
  return !(ctx.graph.nodes[ctx.currentNode].fastRoad && step.isStraight);
};
export const ALL_FILTERS: StepFilter[] = [
  notReused,
  isAllowedRoad,
  withinBudget,
  canReachHome,
  hasOnwardMove,
  legalCrossing,
  avoidsStoplights,
  startsOutward,
  avoidsFastRoads,
];

/** Out-and-back: retracing is the mechanism, and dead ends are turnarounds. */
export const OUT_AND_BACK_FILTERS: StepFilter[] = [
  isAllowedRoad,
  legalCrossing,
  avoidsStoplights,
  startsOutward,
  noTinyLoops,
  avoidsFastRoads,
];

export const FILTER_NAMES = new Map<StepFilter, string>([
  [notReused, "reused"],
  [isAllowedRoad, "road"],
  [withinBudget, "budget"],
  [canReachHome, "unreachable"],
  [hasOnwardMove, "deadend"],
  [legalCrossing, "crossing"],
  [avoidsStoplights, "light"],
  [noTinyLoops, "tinyloop"],
  [startsOutward, "wrongway"],
  [avoidsFastRoads, "traffic"],
]);

export function passesAll(
  ctx: StepContext,
  step: Step,
  filters = ALL_FILTERS
): boolean {
  return filters.every((filter) => filter(ctx, step));
}

/** Partition candidates into legal steps and named rejection counts. */
export function partitionSteps(
  ctx: StepContext,
  steps: Step[],
  filters = ALL_FILTERS
): { legal: Step[]; rejections: Record<string, number> } {
  const rejections: Record<string, number> = {};
  const legal: Step[] = [];

  for (const step of steps) {
    const failed = filters.find((filter) => !filter(ctx, step));
    if (!failed) {
      legal.push(step);
      continue;
    }
    const name = FILTER_NAMES.get(failed) ?? "unknown";
    rejections[name] = (rejections[name] ?? 0) + 1;
  }

  return { legal, rejections };
}
