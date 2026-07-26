import type { RouteRequest } from "../types";

interface Entry<T> {
  value: T;
  expires: number;
}

export class TtlCache<T> {
  private store = new Map<string, Entry<T>>();
  constructor(private ttlMs = 1000 * 60 * 60 * 24) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expires) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T) {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  get size() {
    return this.store.size;
  }
}

export function cacheKey(r: RouteRequest): string {
  return [
    r.start.lat.toFixed(3),
    r.start.lng.toFixed(3),
    r.miles.toFixed(1),
    r.terrain,
    r.roads,
  ].join("|");
}
