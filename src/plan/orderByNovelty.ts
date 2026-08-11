import type { RoadGraph } from "../graph/RoadGraph";
import type { Loop } from "../search/types";
import type { ScoredRoute } from "../types";

interface Fingerprint {
  edges: Map<number, number>; // edgeId -> meters
  meters: number;
}

/**
 * Order the whole pool so each next route covers the most street the
 * routes before it haven't — genuinely different options first, near-twins
 * last. Overlap is meters of shared street (Jaccard on edge sets).
 */
export function orderByNovelty(
  loops: Loop[],
  scored: Map<Loop, ScoredRoute>,
  graph: RoadGraph
): Loop[] {
  if (loops.length <= 1) return [...loops];

  const prints = new Map<Loop, Fingerprint>();
  for (const loop of loops) {
    const edges = new Map<number, number>();
    for (const id of loop.edgeIds) edges.set(id, graph.edges[id].meters);
    let meters = 0;
    for (const m of edges.values()) meters += m;
    prints.set(loop, { edges, meters });
  }

  const remaining = new Set(loops);
  const ordered: Loop[] = [];

  // Seed with the best-scoring route.
  let seed = loops[0];
  for (const loop of loops) {
    if (scored.get(loop)!.score > scored.get(seed)!.score) seed = loop;
  }
  ordered.push(seed);
  remaining.delete(seed);

  // Per remaining route: worst overlap with anything already ordered.
  const maxOverlap = new Map<Loop, number>();
  for (const loop of remaining) {
    maxOverlap.set(loop, overlapOf(prints.get(seed)!, prints.get(loop)!));
  }

  while (remaining.size) {
    let best: Loop | undefined;
    let bestNovelty = -Infinity;
    let bestScore = -Infinity;

    for (const loop of remaining) {
      const novelty = 1 - maxOverlap.get(loop)!;
      const score = scored.get(loop)!.score;
      const wins =
        novelty > bestNovelty + 1e-9 ||
        (Math.abs(novelty - bestNovelty) <= 1e-9 && score > bestScore);
      if (wins) {
        best = loop;
        bestNovelty = novelty;
        bestScore = score;
      }
    }

    ordered.push(best!);
    remaining.delete(best!);

    const chosen = prints.get(best!)!;
    for (const loop of remaining) {
      const overlap = overlapOf(chosen, prints.get(loop)!);
      if (overlap > maxOverlap.get(loop)!) maxOverlap.set(loop, overlap);
    }
  }

  return ordered;
}

/** Meters-weighted Jaccard: shared street / total street across both. */
function overlapOf(a: Fingerprint, b: Fingerprint): number {
  const [small, large] = a.edges.size <= b.edges.size ? [a, b] : [b, a];

  let shared = 0;
  for (const [id, meters] of small.edges) {
    if (large.edges.has(id)) shared += meters;
  }

  const union = a.meters + b.meters - shared;
  return union > 0 ? shared / union : 1;
}
