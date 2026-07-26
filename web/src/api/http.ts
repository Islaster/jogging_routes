import { decodePolyline } from "@core/geo";
import type { PlannerApi, RouteView } from "./types";

export function createHttpApi(baseUrl = "/api"): PlannerApi {
  return {
    async plan(req) {
      const res = await fetch(`${baseUrl}/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Planner failed (${res.status}) ${detail}`.trim());
      }

      const routes = await res.json();
      return routes.map(
        (r: any, i: number): RouteView => ({
          id: r.id ?? `route-${i}`,
          path: decodePolyline(r.polyline),
          miles: r.miles,
          gainFt: r.gainFt,
          ftPerMile: r.ftPerMile,
          sideRoadRatio: r.sideRoadRatio,
          score: r.score,
          breakdown: r.breakdown,
        })
      );
    },
  };
}
