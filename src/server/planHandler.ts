import type { Request, Response } from "express";
import { planRoutes } from "../plan/planRoutes";
import { parseRequest } from "./parseRequest";
import type { PlannerDeps } from "../plan/deps";
import type { ScoredRoute } from "../types";

export function createPlanHandler(deps: PlannerDeps) {
  return async (req: Request, res: Response) => {
    let request;
    try {
      request = parseRequest(req.body);
    } catch (error) {
      return res.status(400).json({ error: (error as Error).message });
    }

    try {
      const routes = await planRoutes(request, deps);
      res.json(routes.map(toClientShape));
    } catch (error) {
      console.error("plan failed:", error);
      res.status(502).json({ error: (error as Error).message });
    }
  };
}

function toClientShape(route: ScoredRoute, index: number) {
  return {
    id: `route-${index}`,
    polyline: route.polyline,
    miles: Number(route.miles.toFixed(2)),
    gainFt: Math.round(route.gainFt),
    ftPerMile: Math.round(route.ftPerMile),
    sideRoadRatio: Number(route.sideRoadRatio.toFixed(3)),
    score: Number(route.score.toFixed(3)),
    breakdown: route.breakdown,
  };
}
