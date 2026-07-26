import { createRoutesClient } from "../services/googleRoutes";
import { createElevationClient } from "../services/googleElevation";
import type { PlannerDeps } from "../planner";

export function buildDeps(): PlannerDeps {
  const apiKey = process.env.MAPS_KEY;
  if (!apiKey) throw new Error("MAPS_KEY not set — check root .env");

  return {
    routes: createRoutesClient({ apiKey }),
    elevation: createElevationClient(apiKey),
  };
}
