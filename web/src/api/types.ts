import type { LatLng, RouteRequest } from "@core/types";

export type { LatLng, RouteRequest };

export interface RouteView {
  id: string;
  path: LatLng[];
  miles: number;
  gainFt: number;
  ftPerMile: number;
  sideRoadRatio: number;
  score: number;
  breakdown: { distance: number; terrain: number; roads: number };
}

export interface PlannerApi {
  plan(req: RouteRequest): Promise<RouteView[]>;
  reroute(req: RouteRequest, waypoints: LatLng[]): Promise<RouteView>;
}
