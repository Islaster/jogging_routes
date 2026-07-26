import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { LatLng } from "../api";

export function Recenter({
  center,
  active,
}: {
  center: LatLng;
  active: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !active) return;
    map.panTo(center);
    map.setZoom(15);
  }, [map, center, active]);
  return null;
}
