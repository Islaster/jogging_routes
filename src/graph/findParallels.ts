import { haversine } from "../geo/distance";
import { bearingBetween } from "../geo/bearing";
import type { RoadGraph } from "./RoadGraph";
import type { GraphEdge } from "./types";
import { LatLng } from "../types";

const INDEX_CELL_DEG = 0.00018; // ~20m

/**
 * Edges that hug each other — untagged sidewalks, frontage lanes.
 * 14m catches a sidewalk beside its roadway but not the far carriageway
 * of a divided boulevard, so crossing to the other side stays legal.
 */
const MIN_LENGTH_M = 40; // stubs and connectors can't be "parallel" to anything

export function findParallels(
  graph: RoadGraph,
  maxOffsetM = 14,
  maxAngleDeg = 20
): number[][] {
  const index = buildPointIndex(graph);
  const axisOf = (edge: GraphEdge) =>
    bearingBetween(edge.geometry[0], edge.geometry[edge.geometry.length - 1]) %
    180;

  return graph.edges.map((edge) => {
    if (edge.meters < MIN_LENGTH_M) return [];

    const axis = axisOf(edge);
    const result: number[] = [];

    for (const otherId of nearbyEdges(index, edge)) {
      const other = graph.edges[otherId];
      if (other.meters < MIN_LENGTH_M) continue;

      // Similar length — a sidewalk mirrors its roadway, a cross street doesn't.
      const ratio =
        Math.min(edge.meters, other.meters) /
        Math.max(edge.meters, other.meters);
      if (ratio < 0.5) continue;

      let angle = Math.abs(axisOf(other) - axis);
      if (angle > 90) angle = 180 - angle;
      if (angle > maxAngleDeg) continue;

      if (hugs(edge, other, maxOffsetM)) result.push(otherId);
    }

    return result;
  });
}

function buildPointIndex(graph: RoadGraph): Map<string, Set<number>> {
  const index = new Map<string, Set<number>>();
  for (const edge of graph.edges) {
    for (const point of edge.geometry) {
      const key = `${Math.floor(point.lat / INDEX_CELL_DEG)}:${Math.floor(
        point.lng / INDEX_CELL_DEG
      )}`;
      if (!index.has(key)) index.set(key, new Set());
      index.get(key)!.add(edge.id);
    }
  }
  return index;
}

function nearbyEdges(
  index: Map<string, Set<number>>,
  edge: GraphEdge
): Set<number> {
  const found = new Set<number>();
  for (const point of edge.geometry) {
    const cy = Math.floor(point.lat / INDEX_CELL_DEG);
    const cx = Math.floor(point.lng / INDEX_CELL_DEG);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (const id of index.get(`${cy + dy}:${cx + dx}`) ?? []) {
          if (id !== edge.id) found.add(id);
        }
      }
    }
  }
  return found;
}

/** Do most of the shorter edge's points sit within `maxOffsetM` of the other? */
/** Do points sampled along the shorter edge sit within `maxOffsetM` of the other? */
function hugs(a: GraphEdge, b: GraphEdge, maxOffsetM: number): boolean {
  const probe = b.meters <= a.meters ? b : a;
  const against = probe === b ? a : b;

  const samples = interpolate(probe.geometry, 8);
  let close = 0;

  for (const point of samples) {
    let nearest = Infinity;
    for (const other of against.geometry) {
      const d = haversine(point, other);
      if (d < nearest) nearest = d;
    }
    if (nearest <= maxOffsetM) close++;
  }

  return close / samples.length >= 0.8;
}

/** Evenly spaced points along a polyline, endpoints excluded. */
function interpolate(geometry: LatLng[], count: number): LatLng[] {
  const points: LatLng[] = [];
  for (let i = 1; i <= count; i++) {
    const t = i / (count + 1);
    const position = t * (geometry.length - 1);
    const index = Math.floor(position);
    const frac = position - index;
    const from = geometry[index];
    const to = geometry[Math.min(index + 1, geometry.length - 1)];
    points.push({
      lat: from.lat + (to.lat - from.lat) * frac,
      lng: from.lng + (to.lng - from.lng) * frac,
    });
  }
  return points;
}
