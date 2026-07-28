import { sample } from "../geo/sample";
import type { LatLng } from "../types";
import type { ElevationSource } from "../graph/attachElevation";

const METERS_TO_FEET = 3.28084;

/** Total climb along a path, in feet. */
export function elevationGain(
  path: LatLng[],
  elevation: ElevationSource
): number {
  const raw = sample(path, 250).map((point) => elevation.at(point));
  const smoothed = smooth(raw, 2);

  let gain = 0;
  for (let i = 1; i < smoothed.length; i++) {
    const change = smoothed[i] - smoothed[i - 1];
    if (change > 0) gain += change;
  }

  return gain * METERS_TO_FEET;
}

/** Moving average — raw elevation data is noisy enough to invent hills. */
function smooth(values: number[], window: number): number[] {
  return values.map((_, i) => {
    const from = Math.max(0, i - window);
    const to = Math.min(values.length, i + window + 1);
    const slice = values.slice(from, to);
    return slice.reduce((sum, v) => sum + v, 0) / slice.length;
  });
}
