import { useCallback, useState } from "react";
import { plannerApi, type RouteRequest, type RouteView } from "../api";

export function useRoutePlanner(initial: RouteRequest) {
  const [request, setRequest] = useState<RouteRequest>(initial);
  const [routes, setRoutes] = useState<RouteView[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const replaceRoute = useCallback((next: RouteView) => {
    setRoutes((rs) => rs.map((r) => (r.id === next.id ? next : r)));
  }, []);

  // add replaceRoute to the returned object

  const plan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await plannerApi.plan(request);
      setRoutes(results);
      setSelectedId(results[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  }, [request]);

  return {
    request,
    setRequest,
    routes,
    selectedId,
    setSelectedId,
    loading,
    error,
    plan,
    replaceRoute,
  };
}
