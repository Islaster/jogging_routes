import { simplifyToBudget } from "@core/geo/simplify";
import type { LatLng } from "../api";

const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

export function buildGoogleMapsUrl(path: LatLng[], maxWaypoints = 9): string {
  if (path.length < 2) throw new Error("Route needs at least 2 points");

  const pins = simplifyToBudget(path, maxWaypoints);
  const waypoints = pins.slice(1, -1); // interior pins; ends are origin/destination

  const params = new URLSearchParams({
    api: "1",
    origin: fmt(path[0]),
    destination: fmt(path[path.length - 1]),
    travelmode: "walking",
  });
  if (waypoints.length) params.set("waypoints", waypoints.map(fmt).join("|"));

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
