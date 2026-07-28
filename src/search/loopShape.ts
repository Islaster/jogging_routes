import { bearingBetween } from "../geo/bearing";
import { haversine } from "../geo/distance";
import type { LatLng } from "../types";
import type { Loop } from "./types";

export interface LoopShape {
  centroidBearingDeg: number;
  centroidDistanceM: number;
  farthestBearingDeg: number;
  farthestDistanceM: number;
}

/** Where a loop sits relative to a point — by its bulk and by its far end. */
export function loopShape(loop: Loop, from: LatLng): LoopShape {
  const centroid = centroidOf(loop.path);
  const farthest = farthestFrom(loop.path, from);

  return {
    centroidBearingDeg: bearingBetween(from, centroid),
    centroidDistanceM: haversine(from, centroid),
    farthestBearingDeg: bearingBetween(from, farthest),
    farthestDistanceM: haversine(from, farthest),
  };
}

function centroidOf(path: LatLng[]): LatLng {
  let lat = 0;
  let lng = 0;
  for (const point of path) {
    lat += point.lat;
    lng += point.lng;
  }
  return { lat: lat / path.length, lng: lng / path.length };
}

function farthestFrom(path: LatLng[], origin: LatLng): LatLng {
  let best = path[0];
  let bestDistance = -1;

  for (const point of path) {
    const distance = haversine(origin, point);
    if (distance > bestDistance) {
      bestDistance = distance;
      best = point;
    }
  }
  return best;
}
