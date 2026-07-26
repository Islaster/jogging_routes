import type { RouteRequest, Terrain, RoadPref } from "../types";

const TERRAINS: Terrain[] = ["flat", "rolling", "hilly"];
const ROADS: RoadPref[] = ["side-roads", "any", "trails"];

const snap = (n: number) => Math.round(n * 2000) / 2000;

export function parseRequest(body: unknown): RouteRequest {
  const b = body as any;
  const lat = Number(b?.start?.lat);
  const lng = Number(b?.start?.lng);
  const miles = Number(b?.miles);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90)
    throw new Error("Invalid start.lat");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180)
    throw new Error("Invalid start.lng");
  if (!Number.isFinite(miles) || miles < 0.5 || miles > 30)
    throw new Error("miles must be 0.5–30");
  if (!TERRAINS.includes(b?.terrain))
    throw new Error(`terrain must be one of: ${TERRAINS.join(", ")}`);
  if (!ROADS.includes(b?.roads))
    throw new Error(`roads must be one of: ${ROADS.join(", ")}`);

  return {
    start: { lat: snap(lat), lng: snap(lng) },
    miles,
    terrain: b.terrain,
    roads: b.roads,
  };
}
