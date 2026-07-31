import { useEffect } from "react";
import { RouteMap } from "./components/RouteMap";
import { RouteControls } from "./components/RouteControls";
import { RouteList } from "./components/RouteList";
import { LocationBar } from "./components/LocationBar";
import { OpenInMaps } from "./components/OpenInMaps";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useRoutePlanner } from "./hooks/useRoutePlanner";
import { useGeolocation } from "./hooks/useGeolocation";
import "./App.css";

const FALLBACK_START = { lat: 34.0522, lng: -118.2437 };

export default function App() {
  const { state: geoState, request: requestLocation } = useGeolocation();
  const {
    request,
    setRequest,
    routes,
    selectedId,
    setSelectedId,
    loading,
    error,
    plan,
  } = useRoutePlanner({
    start: FALLBACK_START,
    miles: 5,
    terrain: "rolling",
    roads: "side-roads",
  });

  useEffect(() => {
    if (geoState.status === "ready") {
      setRequest((prev) => ({ ...prev, start: geoState.position }));
    }
  }, [geoState, setRequest]);

  const selected = routes.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="app">
      <main className="map">
        <ErrorBoundary>
          <RouteMap
            start={request.start}
            routes={routes}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </ErrorBoundary>
      </main>

      <aside className="panel">
        <h1 className="panel-title">Jogging Routes</h1>

        <LocationBar state={geoState} onRequest={requestLocation} />

        <RouteControls
          value={request}
          onChange={setRequest}
          onSubmit={plan}
          loading={loading}
        />

        {error && <p className="error">{error}</p>}

        <RouteList
          routes={routes}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <OpenInMaps route={selected} />
      </aside>
    </div>
  );
}
