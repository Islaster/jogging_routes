import { bearingBetween } from "../geo/bearing";
import { haversine } from "../geo/distance";
import type { LatLng } from "../types";
import type { Step, StepContext } from "./types";

export interface WalkTrace {
  assignedBearing: number;
  steps: TracedStep[];
  halfwayBearing: number | null;
  outcome: string;
}

export interface TracedStep {
  index: number;
  traveledM: number;
  bearingFromStart: number;
  distanceFromStart: number;
  candidates: number;
  legal: number;
  chosenType: string;
  chosenMeters: number;
  chosenTurnDeg: number;
  rejections: Record<string, number>;
}

export function newTrace(assignedBearing: number): WalkTrace {
  return {
    assignedBearing,
    steps: [],
    halfwayBearing: null,
    outcome: "unknown",
  };
}

export function recordStep(
  trace: WalkTrace,
  ctx: StepContext,
  all: Step[],
  legal: Step[],
  chosen: Step,
  rejections: Record<string, number>
): void {
  const start = ctx.graph.nodes[ctx.startNode];
  const here = ctx.graph.nodes[ctx.currentNode];
  const startPoint: LatLng = { lat: start.lat, lng: start.lng };
  const herePoint: LatLng = { lat: here.lat, lng: here.lng };

  trace.steps.push({
    index: trace.steps.length,
    traveledM: Math.round(ctx.traveledM),
    bearingFromStart: Math.round(bearingBetween(startPoint, herePoint)),
    distanceFromStart: Math.round(haversine(startPoint, herePoint)),
    candidates: all.length,
    legal: legal.length,
    chosenType: ctx.graph.edges[chosen.edgeId].type,
    chosenMeters: Math.round(chosen.meters),
    chosenTurnDeg: Math.round(chosen.turnDeg),
    rejections,
  });

  if (trace.halfwayBearing === null && ctx.traveledM >= ctx.targetM * 0.5) {
    trace.halfwayBearing = Math.round(bearingBetween(startPoint, herePoint));
  }
}

export function printTrace(trace: WalkTrace): void {
  console.log(`\n  === walk assigned ${trace.assignedBearing}° ===`);
  for (const step of trace.steps) {
    const rejected = Object.entries(step.rejections)
      .filter(([, n]) => n > 0)
      .map(([name, n]) => `${name}×${n}`)
      .join(" ");
    console.log(
      `    ${String(step.index).padStart(2)}  ` +
        `${String(step.traveledM).padStart(5)}m  ` +
        `at ${String(step.bearingFromStart).padStart(3)}°/${String(
          step.distanceFromStart
        ).padStart(4)}m  ` +
        `${step.legal}/${step.candidates} legal  ` +
        `→ ${step.chosenType} ${step.chosenMeters}m turn ${step.chosenTurnDeg}°  ` +
        `${rejected}`
    );
  }
  console.log(
    `    halfway bearing ${trace.halfwayBearing ?? "n/a"}°, outcome: ${
      trace.outcome
    }`
  );
}
