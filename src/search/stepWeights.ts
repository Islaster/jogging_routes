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

/** Mild pull toward quieter streets among those already allowed. */
export const prefersQuiet: StepWeight = (ctx, step) => {
  const edge = ctx.graph.edges[step.edgeId];
  return ctx.roads === "side-roads" ? 1 : 0.05 + edge.quietness;
};

/** In trails mode, take a path over a street wherever one exists. */
export const prefersTrails: StepWeight = (ctx, step) => {
  if (ctx.roads !== "trails") return 1;
  return isTrail(ctx.graph.edges[step.edgeId]) ? 12 : 1;
};

/** Seek or avoid gradient. */
export const matchesTerrain: StepWeight = (ctx, step) => {
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
  matchesTerrain,
];

export function weightOf(
  ctx: StepContext,
  step: Step,
  weights = ALL_WEIGHTS
): number {
  return weights.reduce((product, weight) => product * weight(ctx, step), 1);
}
