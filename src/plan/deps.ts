import type { LatLng } from "../types";
import type { ElevationSource } from "../graph/attachElevation";

export interface PlannerDeps {
  elevationGrid: (center: LatLng, radiusM: number) => Promise<ElevationSource>;
}
