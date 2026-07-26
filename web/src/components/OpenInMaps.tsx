import { buildGoogleMapsUrl } from "../lib/mapsLink";
import type { RouteView } from "../api";

export function OpenInMaps({ route }: { route: RouteView | null }) {
  if (!route) return null;

  return (
    <a
      className="open-maps"
      href={buildGoogleMapsUrl(route.path)}
      target="_blank"
      rel="noopener noreferrer"
    >
      Open in Google Maps ↗
    </a>
  );
}
