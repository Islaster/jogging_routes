import { sectorOf } from "./sectorOf";
import type { LatLng } from "../types";
import type { Loop } from "../search/types";

/**
 * Pick loops that head in different directions — one per compass sector,
 * best-scoring first. Falls back to filling from the leftovers.
 */
export function diversify(
  loops: Loop[],
  start: LatLng,
  count: number,
  scoreOf: (loop: Loop) => number
): Loop[] {
  const ranked = [...loops].sort((a, b) => scoreOf(b) - scoreOf(a));
  const bySector = groupBySector(ranked, start, 8);
  const queues = [...bySector.values()];

  const picked: Loop[] = [];
  let round = 0;

  while (picked.length < count && queues.some((q) => q.length > round)) {
    for (const queue of queues) {
      if (picked.length >= count) break;
      if (queue.length > round) picked.push(queue[round]);
    }
    round++;
  }

  return picked;
}

function groupBySector(
  ranked: Loop[],
  start: LatLng,
  sectorCount: number
): Map<number, Loop[]> {
  const groups = new Map<number, Loop[]>();

  for (const loop of ranked) {
    const sector = sectorOf(loop, start, sectorCount);
    if (!groups.has(sector)) groups.set(sector, []);
    groups.get(sector)!.push(loop);
  }

  return groups;
}
