import { encodePolyline } from "../geo/polyline";
import type { LatLng } from "../types";

const MAX_LOCATIONS_PER_REQUEST = 512;
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // terrain doesn't change
const DEFAULT_SPACING_M = 100;

/** Elevation samples on a regular grid, interpolated between points. */
export class ElevationGrid {
  constructor(
    private readonly minLat: number,
    private readonly minLng: number,
    private readonly stepLat: number,
    private readonly stepLng: number,
    private readonly rows: number,
    private readonly cols: number,
    private readonly values: Float32Array
  ) {}

  /** Bilinear-interpolated elevation in meters. */
  at(point: LatLng): number {
    const y = clamp((point.lat - this.minLat) / this.stepLat, this.rows);
    const x = clamp((point.lng - this.minLng) / this.stepLng, this.cols);

    const row = Math.floor(y);
    const col = Math.floor(x);
    const dy = y - row;
    const dx = x - col;

    const topLeft = this.values[row * this.cols + col];
    const topRight = this.values[row * this.cols + col + 1];
    const bottomLeft = this.values[(row + 1) * this.cols + col];
    const bottomRight = this.values[(row + 1) * this.cols + col + 1];

    return (
      topLeft * (1 - dx) * (1 - dy) +
      topRight * dx * (1 - dy) +
      bottomLeft * (1 - dx) * dy +
      bottomRight * dx * dy
    );
  }
}

function clamp(value: number, size: number): number {
  return Math.max(0, Math.min(size - 1.001, value));
}

interface CacheEntry {
  grid: ElevationGrid;
  expires: number;
}

const cache = new Map<string, CacheEntry>();

/** Elevation grid covering a radius around a point. Cached for a week. */
export async function fetchElevationGrid(
  center: LatLng,
  radiusM: number,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  spacingM = DEFAULT_SPACING_M
): Promise<ElevationGrid> {
  const key = areaKey(center, radiusM);

  const hit = cache.get(key);
  if (hit && Date.now() < hit.expires) {
    console.log(`elevation cache HIT  ${key}`);
    return hit.grid;
  }

  const layout = gridLayout(center, radiusM, spacingM);
  const points = gridPoints(layout);
  console.log(
    `elevation cache MISS ${key} — ${layout.rows}x${layout.cols}, ` +
      `${Math.ceil(points.length / MAX_LOCATIONS_PER_REQUEST)} requests`
  );

  const values = await fetchElevations(points, apiKey, fetchImpl);
  const grid = new ElevationGrid(
    layout.minLat,
    layout.minLng,
    layout.stepLat,
    layout.stepLng,
    layout.rows,
    layout.cols,
    values
  );

  cache.set(key, { grid, expires: Date.now() + CACHE_TTL_MS });
  return grid;
}

function areaKey(center: LatLng, radiusM: number): string {
  return [
    Math.round(center.lat * 100) / 100,
    Math.round(center.lng * 100) / 100,
    Math.round(radiusM / 500),
  ].join("|");
}

interface GridLayout {
  minLat: number;
  minLng: number;
  stepLat: number;
  stepLng: number;
  rows: number;
  cols: number;
}

function gridLayout(
  center: LatLng,
  radiusM: number,
  spacingM: number
): GridLayout {
  const metersPerDegLng = 111320 * Math.cos((center.lat * Math.PI) / 180);
  const halfLat = radiusM / 111320;
  const halfLng = radiusM / metersPerDegLng;
  const stepLat = spacingM / 111320;
  const stepLng = spacingM / metersPerDegLng;

  return {
    minLat: center.lat - halfLat,
    minLng: center.lng - halfLng,
    stepLat,
    stepLng,
    rows: Math.ceil((2 * halfLat) / stepLat) + 1,
    cols: Math.ceil((2 * halfLng) / stepLng) + 1,
  };
}

function gridPoints(layout: GridLayout): LatLng[] {
  const points: LatLng[] = [];
  for (let row = 0; row < layout.rows; row++) {
    for (let col = 0; col < layout.cols; col++) {
      points.push({
        lat: layout.minLat + row * layout.stepLat,
        lng: layout.minLng + col * layout.stepLng,
      });
    }
  }
  return points;
}

/** Google's Elevation API, in chunks small enough for a GET URL. */
async function fetchElevations(
  points: LatLng[],
  apiKey: string,
  fetchImpl: typeof fetch
): Promise<Float32Array> {
  const values = new Float32Array(points.length);

  for (
    let offset = 0;
    offset < points.length;
    offset += MAX_LOCATIONS_PER_REQUEST
  ) {
    const chunk = points.slice(offset, offset + MAX_LOCATIONS_PER_REQUEST);
    const url =
      "https://maps.googleapis.com/maps/api/elevation/json" +
      `?locations=enc:${encodeURIComponent(
        encodePolyline(chunk)
      )}&key=${apiKey}`;

    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`Elevation HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.status !== "OK") {
      const detail = data.error_message ? ` — ${data.error_message}` : "";
      throw new Error(`Elevation: ${data.status}${detail}`);
    }

    for (let i = 0; i < data.results.length; i++) {
      values[offset + i] = data.results[i].elevation;
    }
  }

  return values;
}
