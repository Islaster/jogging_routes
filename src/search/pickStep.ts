import type { Step } from "./types";

/** Weighted random choice. Weights must be positive. */
export function pickStep(
  steps: Step[],
  weights: number[],
  random: () => number
): Step | null {
  if (!steps.length) return null;

  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) return steps[0];

  let remaining = random() * total;
  for (let i = 0; i < steps.length; i++) {
    remaining -= weights[i];
    if (remaining <= 0) return steps[i];
  }
  return steps[steps.length - 1];
}
