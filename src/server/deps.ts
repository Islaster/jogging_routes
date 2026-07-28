import { fetchElevationGrid } from "../services/elevationGrid";
import type { PlannerDeps } from "../plan/deps";

export function buildDeps(): PlannerDeps {
  const apiKey = process.env.MAPS_KEY;
  if (!apiKey) throw new Error("MAPS_KEY not set — check root .env");

  return {
    elevationGrid: (center, radiusM) =>
      fetchElevationGrid(center, radiusM, apiKey),
  };
}
