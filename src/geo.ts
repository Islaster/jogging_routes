import type { LatLng } from "./types";

const R = 6371000; // earth radius, meters
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

export const MILES_TO_M = 1609.344;
export const M_TO_FT = 3.28084;

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Point at `dist` meters from origin along `bearing` degrees. */
export function destination(
  origin: LatLng,
  bearing: number,
  dist: number
): LatLng {
  const d = dist / R;
  const br = rad(bearing);
  const lat1 = rad(origin.lat);
  const lng1 = rad(origin.lng);

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(br)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(br) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: deg(lat2), lng: ((deg(lng2) + 540) % 360) - 180 };
}

/** Google's encoded polyline algorithm. */
export function decodePolyline(encoded: string): LatLng[] {
  const pts: LatLng[] = [];
  let i = 0,
    lat = 0,
    lng = 0;

  while (i < encoded.length) {
    for (const axis of ["lat", "lng"] as const) {
      let shift = 0,
        result = 0,
        b: number;
      do {
        b = encoded.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === "lat") lat += delta;
      else lng += delta;
    }
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}

/** Evenly sample N points from a dense polyline. */
export function sample<T>(arr: T[], n: number): T[] {
  if (arr.length <= n) return arr;
  const step = (arr.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => arr[Math.round(i * step)]);
}

/** Deterministic PRNG so a given seed always yields the same route. */
export function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inverse of decodePolyline — Google's encoding algorithm. */
export function encodePolyline(points: LatLng[]): string {
  let out = "";
  let prevLat = 0,
    prevLng = 0;
  for (const p of points) {
    const lat = Math.round(p.lat * 1e5);
    const lng = Math.round(p.lng * 1e5);
    out += encodeValue(lat - prevLat) + encodeValue(lng - prevLng);
    prevLat = lat;
    prevLng = lng;
  }
  return out;
}

function encodeValue(v: number): string {
  let value = v < 0 ? ~(v << 1) : v << 1;
  let out = "";
  while (value >= 0x20) {
    out += String.fromCharCode((0x20 | (value & 0x1f)) + 63);
    value >>= 5;
  }
  return out + String.fromCharCode(value + 63);
}

/**
 * Douglas-Peucker with a point budget: keeps start, end, and the
 * `maxInterior` vertices that most define the path's shape.
 * Output preserves original order.
 */
export function simplifyToBudget(
  points: LatLng[],
  maxInterior: number
): LatLng[] {
  if (points.length <= maxInterior + 2) return points;

  const cosLat = Math.cos((points[0].lat * Math.PI) / 180);

  const pointSegDist = (p: LatLng, a: LatLng, b: LatLng): number => {
    const px = (p.lng - a.lng) * cosLat,
      py = p.lat - a.lat;
    const bx = (b.lng - a.lng) * cosLat,
      by = b.lat - a.lat;
    const len2 = bx * bx + by * by;
    if (len2 === 0) return Math.hypot(px, py); // zero chord (closed loop): dist to point
    const t = Math.max(0, Math.min(1, (px * bx + py * by) / len2));
    return Math.hypot(px - t * bx, py - t * by);
  };

  interface Candidate {
    lo: number;
    hi: number;
    idx: number;
    dev: number;
  }

  const evaluate = (lo: number, hi: number): Candidate | null => {
    let idx = -1,
      dev = -1;
    for (let k = lo + 1; k < hi; k++) {
      const d = pointSegDist(points[k], points[lo], points[hi]);
      if (d > dev) {
        dev = d;
        idx = k;
      }
    }
    return idx === -1 ? null : { lo, hi, idx, dev };
  };

  const kept = new Set<number>([0, points.length - 1]);
  const segs: Candidate[] = [];
  const first = evaluate(0, points.length - 1);
  if (first) segs.push(first);

  while (kept.size < maxInterior + 2 && segs.length) {
    let bi = 0;
    for (let i = 1; i < segs.length; i++)
      if (segs[i].dev > segs[bi].dev) bi = i;
    const [c] = segs.splice(bi, 1);
    kept.add(c.idx);
    const left = evaluate(c.lo, c.idx);
    const right = evaluate(c.idx, c.hi);
    if (left) segs.push(left);
    if (right) segs.push(right);
  }

  return [...kept].sort((a, b) => a - b).map((i) => points[i]);
}
