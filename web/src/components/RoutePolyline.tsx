import { useEffect, useMemo } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { offsetPath } from "../lib/offsetPath";
import type { LatLng } from "../api";

const SIDEWALK_OFFSET_M = -4; // left of travel = facing traffic

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

  // True geometry stays in `path` for distances, export, and anything
  // upstream; only the drawn line is shifted onto the sidewalk.
  const displayPath = useMemo(
    () => offsetPath(path, SIDEWALK_OFFSET_M),
    [path]
  );

  useEffect(() => {
    if (!map || displayPath.length === 0) return;

    const line = new google.maps.Polyline({
      path: displayPath,
      map,
      strokeColor: color,
      strokeWeight: weight,
      strokeOpacity: opacity,
      zIndex,
      clickable: Boolean(onClick),
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
            scale: 2.2,
            // Dim arrows follow dim lines, so unselected routes stay quiet.
            strokeOpacity: Math.min(0.9, opacity),
          },
          offset: "30px",
          repeat: "120px",
        },
      ],
    });

    const listener = onClick ? line.addListener("click", onClick) : undefined;

    return () => {
      listener?.remove();
      line.setMap(null);
    };
  }, [map, displayPath, color, weight, opacity, zIndex, onClick]);

  return null;
}
