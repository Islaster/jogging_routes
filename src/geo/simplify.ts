import type { LatLng } from "../types";

/**
 * Douglas-Peucker with a point budget: keeps the endpoints plus the
 * `maxInterior` vertices that most define the path's shape. Output stays
 * in original order.
 */
export function simplifyToBudget(
  points: LatLng[],
  maxInterior: number
): LatLng[] {
  if (points.length <= maxInterior + 2) return points;

  const kept = new Set<number>([0, points.length - 1]);
  const pending: Segment[] = [];

  const first = mostDeviant(points, 0, points.length - 1);
  if (first) pending.push(first);

  while (kept.size < maxInterior + 2 && pending.length) {
    const next = takeMostDeviant(pending);
    kept.add(next.index);

    const left = mostDeviant(points, next.from, next.index);
    const right = mostDeviant(points, next.index, next.to);
    if (left) pending.push(left);
    if (right) pending.push(right);
  }

  return [...kept].sort((a, b) => a - b).map((i) => points[i]);
}

interface Segment {
  from: number;
  to: number;
  index: number;
  deviation: number;
}

/** The vertex furthest from the straight line between two endpoints. */
function mostDeviant(
  points: LatLng[],
  from: number,
  to: number
): Segment | null {
  let index = -1;
  let deviation = -1;

  for (let i = from + 1; i < to; i++) {
    const d = distanceToSegment(points[i], points[from], points[to]);
    if (d > deviation) {
      deviation = d;
      index = i;
    }
  }

  return index === -1 ? null : { from, to, index, deviation };
}

function takeMostDeviant(segments: Segment[]): Segment {
  let best = 0;
  for (let i = 1; i < segments.length; i++) {
    if (segments[i].deviation > segments[best].deviation) best = i;
  }
  return segments.splice(best, 1)[0];
}

/** Approximate perpendicular distance, in degrees scaled for longitude. */
function distanceToSegment(point: LatLng, start: LatLng, end: LatLng): number {
  const cosLat = Math.cos((start.lat * Math.PI) / 180);

  const px = (point.lng - start.lng) * cosLat;
  const py = point.lat - start.lat;
  const ex = (end.lng - start.lng) * cosLat;
  const ey = end.lat - start.lat;

  const lengthSquared = ex * ex + ey * ey;
  if (lengthSquared === 0) return Math.hypot(px, py); // closed loop: distance to the point

  const t = Math.max(0, Math.min(1, (px * ex + py * ey) / lengthSquared));
  return Math.hypot(px - t * ex, py - t * ey);
}
