export interface LatLng {
  lat: number;
  lng: number;
}

export type Terrain = "flat" | "rolling" | "hilly" | "any";
export type RoadPref = "side-roads" | "any" | "trails";

export interface RouteRequest {
  start: LatLng;
  miles: number;
  terrain: Terrain;
  roads: RoadPref;
  avoidStoplights: boolean;
  lowTraffic: boolean;
}

export interface RawRoute {
  polyline: string;
  meters: number;
  seconds: number;
  waypoints: LatLng[];
}

export interface ScoredRoute extends RawRoute {
  miles: number;
  gainFt: number;
  ftPerMile: number;
  sideRoadRatio: number; // 0..1
  score: number; // 0..1
  breakdown: { distance: number; terrain: number; roads: number };
}
