import type { LatLng } from "../types";
import { haversine } from "../geo";

const OVERPASS = "https://overpass-api.de/api/interpreter";

export const ROAD_SCORES: Record<string, number> = {
  // quiet / good for jogging
  footway: 1.0,
  path: 1.0,
  pedestrian: 1.0,
  track: 0.95,
  cycleway: 0.95,
  living_street: 0.9,
  residential: 0.85,
  service: 0.7,
  unclassified: 0.6,
  // busier
  tertiary: 0.4,
  secondary: 0.2,
  primary: 0.05,
  trunk: 0,
  motorway: 0,
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
    const [cLat, cLng] = [
      Math.floor(p.lat / this.cell),
      Math.floor(p.lng / this.cell),
    ];
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

export async function fetchRoadIndex(
  center: LatLng,
  radiusM: number,
  fetchImpl = fetch
): Promise<RoadIndex> {
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

  const res = await fetchImpl(process.env.OVERPASS_URL ?? OVERPASS, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent":
        "jogging-routes-dev/0.1 (personal project; contact: you@example.com)",
      Accept: "application/json",
    },
    body: "data=" + encodeURIComponent(query),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Overpass ${res.status}: ${text
        .replace(/<[^>]+>/g, " ")
        .trim()
        .slice(0, 200)}`
    );
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    const text = await res.text();
    throw new Error(
      `Overpass returned ${contentType}: ${text
        .replace(/<[^>]+>/g, " ")
        .trim()
        .slice(0, 200)}`
    );
  }

  const data = await res.json();

  const index = new RoadIndex();
  for (const way of data.elements ?? []) {
    const type = way.tags?.highway;
    if (!type) continue;
    for (const g of way.geometry ?? [])
      index.add({ lat: g.lat, lng: g.lon, type });
  }
  return index;
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
