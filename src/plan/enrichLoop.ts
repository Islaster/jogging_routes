import { encodePolyline } from "../geo/polyline";
import { elevationGain } from "./elevationGain";
import { scoreLoop } from "./scoreLoop";
import type { ElevationSource } from "../graph/attachElevation";
import type { Loop } from "../search/types";
import type { RouteRequest, ScoredRoute } from "../types";

const MILES_TO_M = 1609.344;
const JOG_SPEED_MPS = 2.6; // ~9:40 per mile

/** A found loop → the shape the client consumes. */
export function enrichLoop(
  loop: Loop,
  request: RouteRequest,
  elevation: ElevationSource
): ScoredRoute {
  const miles = loop.meters / MILES_TO_M;
  const gainFt = elevationGain(loop.path, elevation);
  const ftPerMile = gainFt / Math.max(miles, 0.1);

  const breakdown = scoreLoop(loop, request, miles, ftPerMile);

  return {
    polyline: encodePolyline(loop.path),
    meters: loop.meters,
    seconds: Math.round(loop.meters / JOG_SPEED_MPS),
    waypoints: [],
    miles,
    gainFt,
    ftPerMile,
    sideRoadRatio: loop.quietness,
    breakdown,
    score:
      breakdown.distance * 0.5 +
      breakdown.terrain * 0.25 +
      breakdown.roads * 0.25,
  };
}
