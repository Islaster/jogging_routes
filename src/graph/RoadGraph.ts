import type { LatLng } from "../types";
import { haversine, pathLength } from "../geo/distance";
import { coordKey } from "./coordKey";
import type { EdgeSpec, GraphEdge, GraphNode } from "./types";

const SPATIAL_CELL_DEG = 0.002; // ~200m

export class RoadGraph {
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];
  /** Edges running alongside each edge — sidewalks, frontage lanes. */
  parallel: number[][] = [];

  private nodeIds = new Map<string, number>();
  private spatial = new Map<string, number[]>();

  /** Node id for this coordinate, creating it if new. */
  internNode(lat: number, lng: number): number {
    const key = coordKey(lat, lng);
    const existing = this.nodeIds.get(key);
    if (existing !== undefined) return existing;

    const id = this.nodes.length;
    this.nodes.push({
      id,
      lat,
      lng,
      edges: [],
      signalized: false,
      arterial: false,
    });
    this.nodeIds.set(key, id);

    const cell = this.spatialKey(lat, lng);
    if (!this.spatial.has(cell)) this.spatial.set(cell, []);
    this.spatial.get(cell)!.push(id);

    return id;
  }

  addEdge(from: number, to: number, spec: EdgeSpec): void {
    const meters = pathLength(spec.geometry);
    if (meters < 1 || from === to) return;

    const id = this.edges.length;
    this.edges.push({
      id,
      from,
      to,
      geometry: spec.geometry,
      meters,
      type: spec.type,
      lanes: spec.lanes,
      quietness: spec.quietness,
      crossable: spec.crossable,
      grade: 0,
    });
    this.nodes[from].edges.push(id);
    this.nodes[to].edges.push(id);
  }

  /** The node at an edge's other end. */
  other(edgeId: number, nodeId: number): number {
    const edge = this.edges[edgeId];
    return edge.from === nodeId ? edge.to : edge.from;
  }

  /** Edge geometry ordered so it starts at `fromNode`. */
  orientedGeometry(edgeId: number, fromNode: number): LatLng[] {
    const edge = this.edges[edgeId];
    return edge.from === fromNode
      ? edge.geometry
      : [...edge.geometry].reverse();
  }

  nodeIdAt(lat: number, lng: number): number | undefined {
    return this.nodeIds.get(coordKey(lat, lng));
  }

  nearestNode(point: LatLng, maxMeters = 300): number | null {
    const cells = Math.ceil(maxMeters / (SPATIAL_CELL_DEG * 111320)) + 1;
    const centerLat = Math.floor(point.lat / SPATIAL_CELL_DEG);
    const centerLng = Math.floor(point.lng / SPATIAL_CELL_DEG);

    let best: number | null = null;
    let bestDistance = maxMeters;

    for (let dy = -cells; dy <= cells; dy++) {
      for (let dx = -cells; dx <= cells; dx++) {
        for (const id of this.spatial.get(
          `${centerLat + dy}:${centerLng + dx}`
        ) ?? []) {
          const node = this.nodes[id];
          const distance = haversine(point, { lat: node.lat, lng: node.lng });
          if (distance < bestDistance) {
            bestDistance = distance;
            best = id;
          }
        }
      }
    }
    return best;
  }

  private spatialKey(lat: number, lng: number): string {
    return `${Math.floor(lat / SPATIAL_CELL_DEG)}:${Math.floor(
      lng / SPATIAL_CELL_DEG
    )}`;
  }
}
