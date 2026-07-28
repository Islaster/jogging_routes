import { APIProvider, Map, AdvancedMarker } from "@vis.gl/react-google-maps";
import { RoutePolyline } from "./RoutePolyline";
import { FitBounds } from "./FitBounds";
import type { LatLng, RouteView } from "../api";
import { Recenter } from "./Recenter";
import { EditHandles } from "./EditHandles";

interface Props {
  start: LatLng;
  routes: RouteView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  editPins?: LatLng[];
  onMovePin?: (index: number, pos: LatLng) => void;
  editing?: boolean;
}

export function RouteMap({
  start,
  routes,
  selectedId,
  onSelect,
  editPins,
  onMovePin,
  editing,
}: Props) {
  const selected = routes.find((r) => r.id === selectedId) ?? routes[0];

  return (
    <APIProvider apiKey={import.meta.env.VITE_MAPS_BROWSER_KEY}>
      <Map
        defaultCenter={start}
        defaultZoom={14}
        mapId="DEMO_MAP_ID"
        gestureHandling="greedy"
        disableDefaultUI
        zoomControl
        style={{ width: "100%", height: "100%" }}
      >
        {routes
          .filter((r) => r.id !== selected?.id)
          .map((r) => (
            <RoutePolyline
              key={r.id}
              path={r.path}
              color="#94a3b8"
              weight={4}
              opacity={0.55}
              zIndex={1}
              onClick={() => onSelect(r.id)}
            />
          ))}

        {editing && editPins && onMovePin && (
          <EditHandles pins={editPins} onMove={onMovePin} />
        )}

        {selected && (
          <RoutePolyline
            path={selected.path}
            color="#2563eb"
            weight={6}
            zIndex={2}
          />
        )}

        <AdvancedMarker position={start}>
          <div className="start-dot" />
        </AdvancedMarker>
        <Recenter center={start} active={routes.length === 0} />
        {selected && !editing && <FitBounds path={selected.path} />}
      </Map>
    </APIProvider>
  );
}
