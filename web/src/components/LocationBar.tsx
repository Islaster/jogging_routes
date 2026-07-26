import type { GeoState } from "../hooks/useGeolocation";

interface Props {
  state: GeoState;
  onRequest: () => void;
}

export function LocationBar({ state, onRequest }: Props) {
  if (state.status === "ready") {
    return (
      <div className="locbar ok">
        <span>📍 Starting from your location</span>
        <small>
          {state.position.lat.toFixed(4)}, {state.position.lng.toFixed(4)} · ±
          {Math.round(state.accuracyM)}m
        </small>
        <button className="link" onClick={onRequest}>
          Update
        </button>
      </div>
    );
  }

  return (
    <div className={`locbar ${state.status === "error" ? "bad" : ""}`}>
      <button
        className="secondary"
        onClick={onRequest}
        disabled={state.status === "locating"}
      >
        {state.status === "locating" ? "Locating…" : "📍 Use my location"}
      </button>
      {state.status === "error" && <small>{state.message}</small>}
    </div>
  );
}
