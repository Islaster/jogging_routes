import { bearingBetween, bearingDelta } from "../geo/bearing";
import { isTrail } from "./runnable";
import type { Step, StepContext } from "./types";

export type StepWeight = (ctx: StepContext, step: Step) => number;

/**
 * On the way out, favour steps heading toward this walk's assigned bearing.
 * The `startsOutward` filter handles the opening steps; this keeps gentle
 * pressure through the rest of the outbound half.
 */
export const headsOutward: StepWeight = (ctx, step) => {
  if (ctx.traveledM > ctx.targetM * 0.5) return 1;

  const start = ctx.graph.nodes[ctx.startNode];
  const destination = ctx.graph.nodes[step.toNode];
  const bearing = bearingBetween(
    { lat: start.lat, lng: start.lng },
    { lat: destination.lat, lng: destination.lng }
  );

  const offBy = Math.abs(bearingDelta(ctx.outboundBearingDeg, bearing));
  return 1 + 5 * Math.max(0, 1 - offBy / 90);
};

/**
 * Run the length of a street, then turn. Without this the walk zigzags
 * block by block and never covers a whole street.
 */
export const followsLeg: StepWeight = (ctx, step) => {
  const wantsTurn = ctx.legLengthM >= ctx.legTargetM;
  return step.isStraight === !wantsTurn ? 4 : 1;
};

/** Among allowed streets, quietness only matters as a trail-connector tiebreak. */
export const prefersQuiet: StepWeight = (ctx, step) => {
  if (ctx.roads !== "trails") return 1;
  return 0.05 + ctx.graph.edges[step.edgeId].quietness;
};

/** In trails mode, take a path over a street wherever one exists. */
export const prefersTrails: StepWeight = (ctx, step) => {
  if (ctx.roads !== "trails") return 1;
  return isTrail(ctx.graph.edges[step.edgeId]) ? 12 : 1;
};

/**
 * Reversing onto the street just left is legal (the other sidewalk),
 * but only attractive when nothing else is open.
 */
export const prefersProgress: StepWeight = (ctx, step) =>
  step.edgeId === ctx.previousEdge ? 0.15 : 1;

/** Seek or avoid gradient. */
export const matchesTerrain: StepWeight = (ctx, step) => {
  if (ctx.terrain === "any") return 1;
  const grade = Math.min(ctx.graph.edges[step.edgeId].grade, 0.15);
  if (ctx.terrain === "flat") return 1 / (1 + grade * 40);
  if (ctx.terrain === "hilly") return 1 + grade * 40;
  return 1 + grade * 8;
};

export const ALL_WEIGHTS: StepWeight[] = [
  headsOutward,
  followsLeg,
  prefersQuiet,
  prefersTrails,
  prefersProgress,
  matchesTerrain,
];

export function weightOf(
  ctx: StepContext,
  step: Step,
  weights = ALL_WEIGHTS
): number {
  return weights.reduce((product, weight) => product * weight(ctx, step), 1);
}
