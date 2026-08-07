import type { LatLng } from "../api";

const M_PER_DEG_LAT = 111320;
const MITER_LIMIT = 2; // cap spike length at sharp corners
const MAX_SEGMENT_M = 8; // confine side-flips to the last few meters
const TURNAROUND_PULLBACK_M = 10; // close the V at the corner, not mid-intersection

/**
 * Shift a path sideways by `meters`. Negative = left of travel — the
 * facing-traffic side a runner should be on. A street traversed both ways
 * renders as two strands on opposite sides; turnarounds close in a V at
 * the corner, pulled back from the intersection center where graph nodes
 * actually sit.
 *
 * Display-only: routing, distances, and exports keep the true centerline.
 */
export function offsetPath(points: LatLng[], meters: number): LatLng[] {
  if (points.length < 2 || meters === 0) return points;

  const trimmed = pullBackTurnarounds(points, TURNAROUND_PULLBACK_M);
  const dense = densify(trimmed, MAX_SEGMENT_M);

  const cosLat = Math.cos((dense[0].lat * Math.PI) / 180);
  const closed =
    dense[0].lat === dense[dense.length - 1].lat &&
    dense[0].lng === dense[dense.length - 1].lng;

  const xs = dense.map((p) => p.lng * cosLat * M_PER_DEG_LAT);
  const ys = dense.map((p) => p.lat * M_PER_DEG_LAT);
  const n = dense.length;

  /** Unit normal (right side of travel) of segment i -> i+1. */
  const normal = (i: number): { x: number; y: number } | null => {
    const dx = xs[i + 1] - xs[i];
    const dy = ys[i + 1] - ys[i];
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return null;
    return { x: dy / len, y: -dx / len };
  };

  const out: LatLng[] = [];
  for (let i = 0; i < n; i++) {
    const prev = i > 0 ? normal(i - 1) : closed ? normal(n - 2) : normal(0);
    const next = i < n - 1 ? normal(i) : closed ? normal(0) : normal(n - 2);

    const a = prev ?? next;
    const b = next ?? prev;
    if (!a || !b) {
      out.push(dense[i]);
      continue;
    }

    let nx = a.x + b.x;
    let ny = a.y + b.y;
    const len = Math.hypot(nx, ny);

    if (len < 0.05) {
      // Turnaround tip: the two strands meet on the centerline here.
      out.push(dense[i]);
      continue;
    }

    const scale = Math.min(2 / len, MITER_LIMIT);
    nx = (nx / len) * scale;
    ny = (ny / len) * scale;

    out.push({
      lat: (ys[i] + ny * meters) / M_PER_DEG_LAT,
      lng: (xs[i] + nx * meters) / (M_PER_DEG_LAT * cosLat),
    });
  }

  return out;
}

/**
 * Graph nodes sit at intersection centers, so a turnaround vertex lands in
 * the middle of the cross street. Retract each U-turn tip along its own
 * street so the drawn V closes at the corner instead.
 */
function pullBackTurnarounds(points: LatLng[], pullbackM: number): LatLng[] {
  const cosLat = Math.cos((points[0].lat * Math.PI) / 180);
  const out = points.map((p) => ({ ...p }));

  for (let i = 1; i < points.length - 1; i++) {
    const ax = (points[i].lng - points[i - 1].lng) * cosLat * M_PER_DEG_LAT;
    const ay = (points[i].lat - points[i - 1].lat) * M_PER_DEG_LAT;
    const bx = (points[i + 1].lng - points[i].lng) * cosLat * M_PER_DEG_LAT;
    const by = (points[i + 1].lat - points[i].lat) * M_PER_DEG_LAT;

    const la = Math.hypot(ax, ay);
    const lb = Math.hypot(bx, by);
    if (la < 0.01 || lb < 0.01) continue;

    const dot = (ax * bx + ay * by) / (la * lb);
    if (dot > -0.98) continue; // not a turnaround

    const back = Math.min(pullbackM, la * 0.9);
    out[i] = {
      lat: points[i].lat - ((ay / la) * back) / M_PER_DEG_LAT,
      lng: points[i].lng - ((ax / la) * back) / (M_PER_DEG_LAT * cosLat),
    };
  }

  return out;
}

/** Insert points so no segment exceeds `maxSegM`. */
function densify(points: LatLng[], maxSegM: number): LatLng[] {
  const cosLat = Math.cos((points[0].lat * Math.PI) / 180);
  const out: LatLng[] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = (b.lng - a.lng) * cosLat * M_PER_DEG_LAT;
    const dy = (b.lat - a.lat) * M_PER_DEG_LAT;
    const segments = Math.max(1, Math.ceil(Math.hypot(dx, dy) / maxSegM));

    for (let s = 1; s <= segments; s++) {
      const t = s / segments;
      out.push({
        lat: a.lat + (b.lat - a.lat) * t,
        lng: a.lng + (b.lng - a.lng) * t,
      });
    }
  }

  return out;
}
