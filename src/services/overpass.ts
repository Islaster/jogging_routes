import type { LatLng } from "../types";

const INSTANCES = [
  process.env.OVERPASS_URL,
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter",
].filter(
  (url, i, all): url is string => Boolean(url) && all.indexOf(url) === i
);

const USER_AGENT =
  "jogging-routes/0.1 (https://github.com/Islaster/jogging_routes)";
const RETRY_STATUSES = new Set([429, 504]);
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const ROAD_TYPES = [
  "footway",
  "path",
  "pedestrian",
  "track",
  "cycleway",
  "living_street",
  "residential",
  "tertiary",
  "service",
  "unclassified",
  "secondary",
  "primary",
  "trunk",
];

interface CacheEntry {
  elements: any[];
  expires: number;
}

const cache = new Map<string, CacheEntry>();

/** Raw OSM ways and tagged nodes around a point. Cached per area for a day. */
export async function fetchRoadElements(
  center: LatLng,
  radiusM: number,
  fetchImpl: typeof fetch = fetch
): Promise<any[]> {
  const key = areaKey(center, radiusM);

  const hit = cache.get(key);
  if (hit && Date.now() < hit.expires) {
    console.log(`overpass cache HIT  ${key}`);
    return hit.elements;
  }

  console.log(`overpass cache MISS ${key}`);
  const data = await runQuery(buildQuery(center, radiusM), fetchImpl);
  const elements = data.elements ?? [];

  cache.set(key, { elements, expires: Date.now() + CACHE_TTL_MS });
  return elements;
}

/** ~1km cells, so neighbours share a fetch. */
function areaKey(center: LatLng, radiusM: number): string {
  return [
    Math.round(center.lat * 100) / 100,
    Math.round(center.lng * 100) / 100,
    Math.round(radiusM / 500),
  ].join("|");
}

function buildQuery(center: LatLng, radiusM: number): string {
  const dLat = radiusM / 111320;
  const dLng = radiusM / (111320 * Math.cos((center.lat * Math.PI) / 180));
  const bbox = [
    center.lat - dLat,
    center.lng - dLng,
    center.lat + dLat,
    center.lng + dLng,
  ].join(",");

  return `
    [out:json][timeout:45];
    (
      way["highway"~"^(${ROAD_TYPES.join("|")})$"](${bbox});
      node["highway"~"^(traffic_signals|crossing|stop)$"](${bbox});
    );
    out geom;
  `;
}

/** Try each instance twice before giving up — public mirrors are often busy. */
async function runQuery(query: string, fetchImpl: typeof fetch): Promise<any> {
  let lastError: Error = new Error("No Overpass instances configured");

  for (const url of INSTANCES) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await postQuery(url, query, fetchImpl);
        if (response.ok && isJson(response)) return await response.json();

        lastError = await describeFailure(url, response);
        if (!RETRY_STATUSES.has(response.status)) break;
        await pause(1500 * (attempt + 1));
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        break;
      }
    }
  }

  throw lastError;
}

function postQuery(
  url: string,
  query: string,
  fetchImpl: typeof fetch
): Promise<Response> {
  return fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
    body: "data=" + encodeURIComponent(query),
  });
}

function isJson(response: Response): boolean {
  return (response.headers.get("content-type") ?? "").includes("json");
}

async function describeFailure(
  url: string,
  response: Response
): Promise<Error> {
  const body = (await response.text())
    .replace(/<[^>]+>/g, " ")
    .trim()
    .slice(0, 150);
  return new Error(
    `Overpass ${response.status} @ ${new URL(url).host}: ${body}`
  );
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
