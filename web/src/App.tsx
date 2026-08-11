import { useEffect, useState } from "react";
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
  const PAGE_SIZE = 5;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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
    terrain: "any",
    roads: "any",
    avoidStoplights: false,
    lowTraffic: false,
  });
  const findRoutes = () => {
    setVisibleCount(PAGE_SIZE); // a fresh plan starts back at page one
    plan();
  };

  const visibleRoutes = routes.slice(0, visibleCount);

  useEffect(() => {
    if (geoState.status === "ready") {
      setRequest((prev) => ({ ...prev, start: geoState.position }));

      // Pre-warm the road cache for this area while the person picks filters.
      fetch("/api/warm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(geoState.position),
      }).catch(() => {});
    }
  }, [geoState, setRequest]);

  const selected = routes.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="app">
      <main className="map">
        <ErrorBoundary>
          <RouteMap
            start={request.start}
            routes={visibleRoutes}
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
          onSubmit={findRoutes}
          loading={loading}
        />

        {error && <p className="error">{error}</p>}

        <RouteList
          routes={visibleRoutes}
          selectedId={selectedId}
          onSelect={setSelectedId}
          hasMore={routes.length > visibleCount}
          onLoadMore={() => setVisibleCount((count) => count + PAGE_SIZE)}
        />

        <OpenInMaps route={selected} />
      </aside>
    </div>
  );
}
