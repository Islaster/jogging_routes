import type { Loop } from "../search/types";
import type { ScoredRoute } from "../types";

/** Keep enough candidates that diversification still has room to work. */
const MIN_POOL_MULTIPLIER = 4;
const SCORE_TOLERANCE = 0.15;

/**
 * Narrow to the loops that best match the requested terrain, so sector
 * diversification chooses among appropriate routes rather than overriding
 * the preference.
 */
export function filterByTerrain(
  loops: Loop[],
  scored: Map<Loop, ScoredRoute>,
  count: number
): Loop[] {
  const minimumPool = count * MIN_POOL_MULTIPLIER;
  if (loops.length <= minimumPool) return loops;

  const byTerrain = [...loops].sort(
    (a, b) =>
      scored.get(b)!.breakdown.terrain - scored.get(a)!.breakdown.terrain
  );

  const best = scored.get(byTerrain[0])!.breakdown.terrain;
  const matching = byTerrain.filter(
    (loop) => scored.get(loop)!.breakdown.terrain >= best - SCORE_TOLERANCE
  );

  return matching.length >= minimumPool
    ? matching
    : byTerrain.slice(0, minimumPool);
}
