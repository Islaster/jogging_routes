import type { RouteRequest } from "../types";
import type { NetworkExtent } from "../search/measureNetwork";

const MILES_TO_M = 1609.344;

const KIND: Record<RouteRequest["roads"], string> = {
  trails: "trails or paths",
  "side-roads": "side roads",
  any: "roads",
};

const ALTERNATIVE: Record<RouteRequest["roads"], string> = {
  trails: 'Try "Side roads" instead.',
  "side-roads": 'Try "Any" roads.',
  any: "Try a different distance.",
};

/** Nothing of the requested kind starts anywhere near here. */
export function noNetworkNearby(
  request: RouteRequest,
  foundAnyMeters: number
): string {
  const kind = KIND[request.roads];
  if (foundAnyMeters < 200) {
    return `No ${kind} anywhere near here. ${ALTERNATIVE[request.roads]}`;
  }
  return `There are ${kind} nearby, but none you can reach on foot from this spot. ${
    ALTERNATIVE[request.roads]
  }`;
}

/** Some exists, but not enough to loop the requested distance. */
export function networkTooSmall(
  request: RouteRequest,
  extent: NetworkExtent
): string {
  const availableMiles = extent.connectedMeters / MILES_TO_M;
  const kind = KIND[request.roads];
  return (
    `Only ${availableMiles.toFixed(
      1
    )} miles of connected ${kind} from here — ` +
    `not enough for a ${request.miles} mile loop. ` +
    `Try a shorter distance, or ${ALTERNATIVE[request.roads].toLowerCase()}`
  );
}

/** Enough network, but no closed loop of the right length exists. */
export function noLoopFound(request: RouteRequest): string {
  return (
    `Found ${KIND[request.roads]} nearby, but no ${request.miles} mile loop ` +
    `that returns here without doubling back. Try a nearby distance.`
  );
}
