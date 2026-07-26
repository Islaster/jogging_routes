import { useCallback, useEffect, useState } from "react";
import type { LatLng } from "../api";

export type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ready"; position: LatLng; accuracyM: number }
  | { status: "error"; message: string };

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 15_000,
  maximumAge: 30_000,
};

function describe(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission denied. Enable it to start from where you are.";
    case err.POSITION_UNAVAILABLE:
      return "Could not determine your location. Try moving outdoors.";
    case err.TIMEOUT:
      return "Location request timed out. Try again.";
    default:
      return "Location unavailable.";
  }
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setState({
        status: "error",
        message: "This browser has no location support.",
      });
      return;
    }
    if (!window.isSecureContext) {
      setState({
        status: "error",
        message: "Location needs HTTPS or localhost.",
      });
      return;
    }

    setState({ status: "locating" });

    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setState({
          status: "ready",
          position: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracyM: pos.coords.accuracy,
        }),
      (err) => setState({ status: "error", message: describe(err) }),
      OPTIONS
    );
  }, []);

  useEffect(() => {
    if (!navigator.permissions?.query) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((res) => {
        if (res.state === "granted") request();
      })
      .catch(() => {});
  }, [request]);

  return { state, request };
}
