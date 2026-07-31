import { decodePolyline } from "@core/geo/polyline";
import type { PlannerApi, RouteView } from "./types";

function toRouteView(r: any, i: number): RouteView {
  return {
    id: r.id ?? `route-${i}`,
    path: decodePolyline(r.polyline),
    miles: r.miles,
    gainFt: r.gainFt,
    ftPerMile: r.ftPerMile,
    sideRoadRatio: r.sideRoadRatio,
    score: r.score,
    breakdown: r.breakdown,
  };
}

export function createHttpApi(baseUrl = "/api"): PlannerApi {
  return {
    async plan(req) {
      const res = await fetch(`${baseUrl}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });
      if (!res.ok) {
        throw await errorFrom(res, "Couldn't find routes. Please try again.");
      }
      return (await res.json()).map(toRouteView);
    },

    async reroute(req, waypoints) {
      const res = await fetch(`${baseUrl}/reroute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...req, waypoints }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Reroute failed (${res.status}) ${detail}`.trim());
      }
      return toRouteView(await res.json(), 0);
    },
  };
}

async function errorFrom(res: Response, fallback: string): Promise<Error> {
  try {
    const body = await res.json();
    if (body?.error) return new Error(body.error);
  } catch {
    // not JSON — fall through
  }
  return new Error(fallback);
}
