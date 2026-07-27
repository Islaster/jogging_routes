import type { LatLng } from "../types";
import { haversine } from "../geo";

export const ROAD_SCORES: Record<string, number> = {
  // quiet / good for jogging
  footway: 1.0,
  path: 1.0,
  pedestrian: 1.0,
  cycleway: 0.95,
  living_street: 0.9,
  residential: 0.85,
  service: 0.7,
  unclassified: 0.6,
  // busier
  tertiary: 0.4,
  secondary: 0.2,
  primary: 0.05,
};

interface RoadNode {
  lat: number;
  lng: number;
  type: string;
}

export class RoadIndex {
  private grid = new Map<string, RoadNode[]>();
  private cell = 0.002; // ~200m

  private key(lat: number, lng: number) {
    return `${Math.floor(lat / this.cell)}:${Math.floor(lng / this.cell)}`;
  }

  add(node: RoadNode) {
    const k = this.key(node.lat, node.lng);
    if (!this.grid.has(k)) this.grid.set(k, []);
    this.grid.get(k)!.push(node);
  }

  /** Nearest road type within `maxDist` meters, or null. */
  classify(p: LatLng, maxDist = 30): string | null {
    const cLat = Math.floor(p.lat / this.cell);
    const cLng = Math.floor(p.lng / this.cell);
    let best: string | null = null;
    let bestD = maxDist;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const n of this.grid.get(`${cLat + dy}:${cLng + dx}`) ?? []) {
          const d = haversine(p, { lat: n.lat, lng: n.lng });
          if (d < bestD) {
            bestD = d;
            best = n.type;
          }
        }
      }
    }
    return best;
  }
}

/** Mean quietness of a route, 0..1. */
export function sideRoadRatio(points: LatLng[], index: RoadIndex): number {
  let sum = 0,
    n = 0;
  for (const p of points) {
    const type = index.classify(p);
    if (type) {
      sum += ROAD_SCORES[type] ?? 0.5;
      n++;
    }
  }
  return n ? sum / n : 0.5;
}

// ---------------------------------------------------------------------------
// Overpass fetching: multi-instance failover + retry + per-area cache
// ---------------------------------------------------------------------------

const OVERPASS_INSTANCES = [
  process.env.OVERPASS_URL, // preferred (from .env / Railway)
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
].filter((u, i, a): u is string => Boolean(u) && a.indexOf(u) === i);

const UA = "jogging-routes/0.1 (https://github.com/Islaster/jogging_routes)";

interface CacheEntry {
  index: RoadIndex;
  expires: number;
}
const roadCache = new Map<string, CacheEntry>();
const ROAD_TTL = 1000 * 60 * 60 * 24;

/** ~1km grid cell — one Overpass fetch covers a neighborhood. */
function areaKey(center: LatLng, radiusM: number): string {
  return [
    Math.round(center.lat * 100) / 100,
    Math.round(center.lng * 100) / 100,
    Math.round(radiusM / 500),
  ].join("|");
}

async function queryOverpass(
  query: string,
  fetchImpl: typeof fetch
): Promise<any> {
  let lastErr: Error = new Error("no Overpass instances configured");

  for (const url of OVERPASS_INSTANCES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetchImpl(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": UA,
            Accept: "application/json",
          },
          body: "data=" + encodeURIComponent(query),
        });

        const contentType = res.headers.get("content-type") ?? "";
        if (res.ok && contentType.includes("json")) return await res.json();

        const text = (await res.text())
          .replace(/<[^>]+>/g, " ")
          .trim()
          .slice(0, 150);
        lastErr = new Error(
          `Overpass ${res.status} @ ${new URL(url).host}: ${text}`
        );

        // 429/504 = server busy: brief backoff then retry/failover. Others: skip instance.
        if (res.status === 429 || res.status === 504) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
          continue;
        }
        break;
      } catch (e) {
        lastErr = e instanceof Error ? e : new Error(String(e));
        break; // network error -> next instance
      }
    }
  }
  throw lastErr;
}

export async function fetchRoadIndex(
  center: LatLng,
  radiusM: number,
  fetchImpl = fetch
): Promise<RoadIndex> {
  const key = areaKey(center, radiusM);
  const hit = roadCache.get(key);
  if (hit && Date.now() < hit.expires) {
    console.log(`roads cache HIT  ${key}`);
    return hit.index;
  }

  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((center.lat * Math.PI) / 180));
  const bbox = [
    center.lat - dLat,
    center.lng - dLng,
    center.lat + dLat,
    center.lng + dLng,
  ].join(",");

  const query = `
    [out:json][timeout:45];
    way["highway"~"^(${Object.keys(ROAD_SCORES).join("|")})$"](${bbox});
    out geom;
  `;

  console.log(`roads cache MISS ${key} — querying Overpass`);
  const data = await queryOverpass(query, fetchImpl);

  const index = new RoadIndex();
  for (const way of data.elements ?? []) {
    const type = way.tags?.highway;
    if (!type) continue;
    for (const g of way.geometry ?? [])
      index.add({ lat: g.lat, lng: g.lon, type });
  }

  roadCache.set(key, { index, expires: Date.now() + ROAD_TTL });
  return index;
}
