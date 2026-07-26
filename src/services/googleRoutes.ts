import type { LatLng, RawRoute } from "../types";

const ENDPOINT = "https://routes.googleapis.com/directions/v2:computeRoutes";

const wp = (p: LatLng) => ({
  location: { latLng: { latitude: p.lat, longitude: p.lng } },
});

export interface RoutesClientConfig {
  apiKey: string;
  fetchImpl?: typeof fetch;
}

export function createRoutesClient({
  apiKey,
  fetchImpl = fetch,
}: RoutesClientConfig) {
  return {
    async computeLoop(
      start: LatLng,
      waypoints: LatLng[]
    ): Promise<RawRoute | null> {
      const res = await fetchImpl(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: wp(start),
          destination: wp(start), // loop: back to start
          intermediates: waypoints.map(wp),
          travelMode: "WALK",
          polylineQuality: "HIGH_QUALITY",
          optimizeWaypointOrder: false, // preserve ring order
          languageCode: "en-US",
          units: "IMPERIAL",
        }),
      });

      if (!res.ok)
        throw new Error(`Routes API ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const route = data.routes?.[0];
      if (!route) return null;

      return {
        polyline: route.polyline.encodedPolyline,
        meters: route.distanceMeters,
        seconds: parseInt(route.duration ?? "0", 10),
        waypoints,
      };
    },
  };
}
