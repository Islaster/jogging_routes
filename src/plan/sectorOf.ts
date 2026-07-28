import { bearingBetween } from "../geo/bearing";
import { haversine } from "../geo/distance";
import type { LatLng } from "../types";
import type { Loop } from "../search/types";

/**
 * Which compass sector this loop heads into, judged by its farthest point.
 * That point is what makes two loops feel like different runs.
 */
export function sectorOf(
  loop: Loop,
  start: LatLng,
  sectorCount: number
): number {
  const farthest = farthestPoint(loop.path, start);
  const bearing = bearingBetween(start, farthest);
  return Math.floor((bearing / 360) * sectorCount) % sectorCount;
}

function farthestPoint(path: LatLng[], from: LatLng): LatLng {
  let best = path[0];
  let bestDistance = -1;

  for (const point of path) {
    const distance = haversine(from, point);
    if (distance > bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }

  return best;
}
