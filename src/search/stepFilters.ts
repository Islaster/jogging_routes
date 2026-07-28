import { haversine } from "../geo/distance";
import { bearingBetween, bearingDelta } from "../geo/bearing";
import { isRunnable } from "./runnable";
import type { Step, StepContext } from "./types";

export type StepFilter = (ctx: StepContext, step: Step) => boolean;

export const startsOutward: StepFilter = (ctx, step) => {
  if (ctx.traveledM > ctx.targetM * 0.2) return true;

  const start = ctx.graph.nodes[ctx.startNode];
  const destination = ctx.graph.nodes[step.toNode];
  const bearing = bearingBetween(
    { lat: start.lat, lng: start.lng },
    { lat: destination.lat, lng: destination.lng }
  );

  return Math.abs(bearingDelta(ctx.outboundBearingDeg, bearing)) <= 75;
};

/** Never run the same stretch twice — nor its parallel sidewalk. */
export const notReused: StepFilter = (ctx, step) =>
  !ctx.usedEdges.has(step.edgeId);

/** Only streets matching the road preference. */
export const isAllowedRoad: StepFilter = (ctx, step) =>
  isRunnable(ctx.graph.edges[step.edgeId], ctx.roads);

/** Don't exceed the distance ceiling. */
export const withinBudget: StepFilter = (ctx, step) =>
  ctx.traveledM + step.meters <= ctx.maxTotalM;

/** The far end must be somewhere we could still get home from. */
export const canReachHome: StepFilter = (ctx, step) =>
  ctx.homeDistances[step.toNode] !== Infinity;

/** Don't walk into a dead end — the way back would be blocked. */
export const hasOnwardMove: StepFilter = (ctx, step) => {
  if (step.toNode === ctx.startNode) return true;
  return ctx.graph.nodes[step.toNode].edges.some(
    (id) =>
      id !== step.edgeId &&
      !ctx.usedEdges.has(id) &&
      isRunnable(ctx.graph.edges[id], ctx.roads)
  );
};

/**
 * Crossing a big street means going straight through where it meets ours.
 * Only allowed where OSM marks a signal or crosswalk. Turning is always fine.
 */
export const legalCrossing: StepFilter = (ctx, step) => {
  const node = ctx.graph.nodes[ctx.currentNode];
  if (!node.arterial || node.signalized) return true;
  if (!step.isStraight) return true;
  if (ctx.previousEdge === undefined) return true;
  return !ctx.graph.edges[ctx.previousEdge].crossable;
};

/** Keep circling the start rather than running out and back along one street. */
export const maintainsSweep: StepFilter = (ctx, step) => {
  if (ctx.traveledM <= ctx.targetM * 0.3) return true;
  if (Math.abs(ctx.sweepDeg) >= 150) return true;
  if (ctx.lastBearingDeg === null) return true;

  const start = ctx.graph.nodes[ctx.startNode];
  const to = ctx.graph.nodes[step.toNode];
  const startPoint = { lat: start.lat, lng: start.lng };
  const toPoint = { lat: to.lat, lng: to.lng };

  if (haversine(startPoint, toPoint) <= 40) return true;

  const delta = bearingDelta(
    ctx.lastBearingDeg,
    bearingBetween(startPoint, toPoint)
  );
  return ctx.turnDirection > 0 ? delta >= -20 : delta <= 20;
};

export const ALL_FILTERS: StepFilter[] = [
  notReused,
  isAllowedRoad,
  withinBudget,
  canReachHome,
  hasOnwardMove,
  legalCrossing,
  startsOutward,
];

/** Out-and-back: retracing is expected, and every dead end is a turnaround. */
export const OUT_AND_BACK_FILTERS: StepFilter[] = [
  isAllowedRoad,
  legalCrossing,
  startsOutward,
];

export function passesAll(
  ctx: StepContext,
  step: Step,
  filters = ALL_FILTERS
): boolean {
  return filters.every((filter) => filter(ctx, step));
}

export const FILTER_NAMES = new Map<StepFilter, string>([
  [notReused, "reused"],
  [isAllowedRoad, "road"],
  [withinBudget, "budget"],
  [canReachHome, "unreachable"],
  [hasOnwardMove, "deadend"],
  [legalCrossing, "crossing"],
  [startsOutward, "wrongway"],
]);

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
