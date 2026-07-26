import type { Request, Response } from "express";
import { planRoutes, type PlannerDeps } from "../planner";
import type { ScoredRoute } from "../types";
import { parseRequest } from "./validate";
import { TtlCache, cacheKey } from "./cache";

function toClientShape(r: ScoredRoute, i: number) {
  return {
    id: `route-${i}`,
    polyline: r.polyline,
    miles: Number(r.miles.toFixed(2)),
    gainFt: Math.round(r.gainFt),
    ftPerMile: Math.round(r.ftPerMile),
    sideRoadRatio: Number(r.sideRoadRatio.toFixed(3)),
    score: Number(r.score.toFixed(3)),
    breakdown: r.breakdown,
  };
}

const cache = new TtlCache<ReturnType<typeof toClientShape>[]>();

export function createPlanHandler(deps: PlannerDeps) {
  return async (req: Request, res: Response) => {
    let parsed;
    try {
      parsed = parseRequest(req.body);
    } catch (e) {
      return res.status(400).json({ error: (e as Error).message });
    }

    const key = cacheKey(parsed);
    const cached = cache.get(key);
    if (cached) {
      console.log(`cache HIT  ${key}`);
      return res.json(cached);
    }

    try {
      console.log(`cache MISS ${key} — calling Google`);
      const routes = await planRoutes(parsed, deps);
      const payload = routes.map(toClientShape);
      if (payload.length) cache.set(key, payload);
      res.json(payload);
    } catch (e) {
      console.error("plan failed:", e);
      res.status(502).json({ error: (e as Error).message });
    }
  };
}
