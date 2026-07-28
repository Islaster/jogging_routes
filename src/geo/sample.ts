import type { LatLng } from "../types";

/** Evenly spaced subset of `n` items. */
export function sample<T>(items: T[], n: number): T[] {
  if (items.length <= n) return items;
  const step = (items.length - 1) / (n - 1);
  return Array.from({ length: n }, (_, i) => items[Math.round(i * step)]);
}

/** 0..1 — how much two paths cover the same ground. */
export function pathOverlap(
  a: LatLng[],
  b: LatLng[],
  cellDeg = 0.0006
): number {
  const cellsOf = (path: LatLng[]) =>
    new Set(
      path.map(
        (p) => `${Math.floor(p.lat / cellDeg)}:${Math.floor(p.lng / cellDeg)}`
      )
    );

  const cellsA = cellsOf(a);
  const cellsB = cellsOf(b);

  let shared = 0;
  for (const cell of cellsA) if (cellsB.has(cell)) shared++;
  return shared / Math.max(1, Math.min(cellsA.size, cellsB.size));
}
