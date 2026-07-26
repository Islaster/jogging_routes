import { useEffect } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import type { LatLng } from "../api";

interface Props {
  path: LatLng[];
  color?: string;
  weight?: number;
  opacity?: number;
  zIndex?: number;
  onClick?: () => void;
}

export function RoutePolyline({
  path,
  color = "#2563eb",
  weight = 5,
  opacity = 1,
  zIndex = 1,
  onClick,
}: Props) {
  const map = useMap();

  useEffect(() => {
    if (!map || path.length === 0) return;

    const line = new google.maps.Polyline({
      path,
      map,
      strokeColor: color,
      strokeWeight: weight,
      strokeOpacity: opacity,
      zIndex,
      clickable: Boolean(onClick),
    });

    const listener = onClick ? line.addListener("click", onClick) : undefined;

    return () => {
      listener?.remove();
      line.setMap(null);
    };
  }, [map, path, color, weight, opacity, zIndex, onClick]);

  return null;
}
