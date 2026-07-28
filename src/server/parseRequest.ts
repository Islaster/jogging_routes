import type { RouteRequest, RoadPref, Terrain } from "../types";

const TERRAINS: Terrain[] = ["flat", "rolling", "hilly"];
const ROADS: RoadPref[] = ["side-roads", "any", "trails"];

/** ~50m grid — keeps precise coordinates out of logs and helps caches hit. */
const snap = (value: number) => Math.round(value * 2000) / 2000;

export function parseRequest(body: unknown): RouteRequest {
  const input = body as any;

  const lat = Number(input?.start?.lat);
  const lng = Number(input?.start?.lng);
  const miles = Number(input?.miles);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90)
    throw new Error("Invalid start.lat");
  if (!Number.isFinite(lng) || lng < -180 || lng > 180)
    throw new Error("Invalid start.lng");
  if (!Number.isFinite(miles) || miles < 0.5 || miles > 30)
    throw new Error("miles must be 0.5–30");
  if (!TERRAINS.includes(input?.terrain))
    throw new Error(`terrain must be one of: ${TERRAINS.join(", ")}`);
  if (!ROADS.includes(input?.roads))
    throw new Error(`roads must be one of: ${ROADS.join(", ")}`);

  return {
    start: { lat: snap(lat), lng: snap(lng) },
    miles,
    terrain: input.terrain,
    roads: input.roads,
  };
}
