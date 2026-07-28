import { useCallback, useRef, useState } from "react";
import { simplifyToBudget } from "@core/geo/simplify";
import {
  plannerApi,
  type LatLng,
  type RouteRequest,
  type RouteView,
} from "../api";

export function useRouteEditor(
  request: RouteRequest,
  onRouteUpdated: (route: RouteView) => void
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pins, setPins] = useState<LatLng[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  const beginEdit = useCallback((route: RouteView) => {
    setEditingId(route.id);
    setPins(simplifyToBudget(route.path, 10).slice(1, -1)); // interior turn points
    setError(null);
  }, []);

  const endEdit = useCallback(() => {
    setEditingId(null);
    setPins([]);
  }, []);

  const movePin = useCallback(
    async (index: number, pos: LatLng) => {
      if (!editingId) return;
      const next = pins.map((p, i) => (i === index ? pos : p));
      setPins(next); // pins are truth; update immediately

      const id = ++runId.current;
      setBusy(true);
      setError(null);
      try {
        const route = await plannerApi.reroute(request, next);
        if (id !== runId.current) return; // a newer drag superseded this response
        onRouteUpdated({ ...route, id: editingId }); // keep identity in the list
      } catch (e) {
        if (id !== runId.current) return;
        setError(e instanceof Error ? e.message : "Reroute failed");
      } finally {
        if (id === runId.current) setBusy(false);
      }
    },
    [editingId, pins, request, onRouteUpdated]
  );

  return { editingId, pins, busy, error, beginEdit, endEdit, movePin };
}
