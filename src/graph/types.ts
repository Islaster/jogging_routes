import type { LatLng } from "../types";

export interface GraphNode {
  id: number;
  lat: number;
  lng: number;
  edges: number[];
  signalized: boolean;
  arterial: boolean;
  stoplight: boolean; // an actual traffic light, not just any signal tag
  fastRoad: boolean;
}

export interface GraphEdge {
  id: number;
  from: number;
  to: number;
  geometry: LatLng[]; // oriented from -> to
  meters: number;
  type: string;
  lanes: number;
  sidewalkSides: 0 | 1 | 2;
  /** May be traversed once per direction: two certified sidewalks, or ≤20 mph. */
  loopable: boolean;
  fastRoad: boolean;
  quietness: number;
  crossable: boolean; // 2 lanes or fewer, minor class
  grade: number; // mean absolute gradient, set later
}

/** One OSM way after classification, before splitting. */
export interface ParsedWay {
  type: string;
  lanes: number;
  quietness: number;
  crossable: boolean;
  sidewalkSides: 0 | 1 | 2;
  /** May be traversed once per direction: two certified sidewalks, or ≤20 mph. */
  loopable: boolean;
  fastRoad: boolean;
  geometry: LatLng[];
}

/** One junction-to-junction stretch, before it enters the graph. */
export interface EdgeSpec {
  geometry: LatLng[];
  type: string;
  lanes: number;
  quietness: number;
  crossable: boolean;
  sidewalkSides: 0 | 1 | 2;
  /** May be traversed once per direction: two certified sidewalks, or ≤20 mph. */
  loopable: boolean;
  fastRoad: boolean;
}
