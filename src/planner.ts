import { generateCandidates } from "./loopGenerator";
import { decodePolyline, sample, MILES_TO_M } from "./geo";
import { fetchRoadIndex, sideRoadRatio } from "./services/osmRoads";
import { scoreDistance, scoreTerrain, scoreRoads, combine } from "./scorer";
import type { RouteRequest, ScoredRoute, RawRoute } from "./types";

export interface PlannerDeps {
  routes: { computeLoop: (s: any, w: any) => Promise<RawRoute | null> };
  elevation: {
    profile: (p: string, n?: number) => Promise<{ gainFt: number }>;
  };
  fetchImpl?: typeof fetch;
}

export interface PlannerOptions {
  candidates?: number;
  finalists?: number;
  tolerance?: number;
}

export async function planRoutes(
  req: RouteRequest,
  deps: PlannerDeps,
  opts: PlannerOptions = {}
): Promise<ScoredRoute[]> {
  const { candidates = 6, finalists = 3, tolerance = 0.12 } = opts;
  const targetM = req.miles * MILES_TO_M;

  // --- Pass 1: geometry + routing, with one calibration retry -------------
  let detour = 1.3;
  let raw = await routeAll(req, deps, candidates, detour);

  const median = medianOf(raw.map((r) => r.meters));
  if (median > 0 && Math.abs(median - targetM) / targetM > tolerance) {
    detour = detour * (median / targetM); // network is loopier/straighter than assumed
    raw = await routeAll(req, deps, candidates, detour);
  }

  // --- Prune before spending on elevation + Overpass ----------------------
  const survivors = raw
    .sort((a, b) => Math.abs(a.meters - targetM) - Math.abs(b.meters - targetM))
    .slice(0, finalists);

  if (!survivors.length) return [];

  const roadIndex = await fetchRoadIndex(
    req.start,
    targetM / 4,
    deps.fetchImpl ?? fetch
  );

  // --- Pass 2: enrich + score --------------------------------------------
  const scored = await Promise.all(
    survivors.map(async (r): Promise<ScoredRoute> => {
      const { gainFt } = await deps.elevation.profile(r.polyline, 200);
      const miles = r.meters / MILES_TO_M;
      const ftPerMile = gainFt / Math.max(miles, 0.1);
      const ratio = sideRoadRatio(
        sample(decodePolyline(r.polyline), 120),
        roadIndex
      );

      const breakdown = {
        distance: scoreDistance(miles, req.miles),
        terrain: scoreTerrain(ftPerMile, req.terrain),
        roads: scoreRoads(ratio, req.roads),
      };

      return {
        ...r,
        miles,
        gainFt,
        ftPerMile,
        sideRoadRatio: ratio,
        breakdown,
        score: combine(breakdown),
      };
    })
  );

  return scored.sort((a, b) => b.score - a.score);
}

async function routeAll(
  req: RouteRequest,
  deps: PlannerDeps,
  count: number,
  detour: number
): Promise<RawRoute[]> {
  const loops = generateCandidates(req.start, req.miles, count, detour);
  const results = await Promise.allSettled(
    loops.map((l) => deps.routes.computeLoop(req.start, l.waypoints))
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<RawRoute> =>
        r.status === "fulfilled" && r.value !== null
    )
    .map((r) => r.value);
}

function medianOf(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
