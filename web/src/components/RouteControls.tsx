import type { RouteRequest } from "../api";

interface Props {
  value: RouteRequest;
  onChange: (next: RouteRequest) => void;
  onSubmit: () => void;
  loading: boolean;
}

const DISTANCES = [1, 2, 3, 5, 10];

const TERRAINS = [
  { value: "flat", label: "Flat" },
  { value: "rolling", label: "Rolling" },
  { value: "hilly", label: "Hilly" },
] as const;

const ROADS = [
  { value: "side-roads", label: "Side roads" },
  { value: "trails", label: "Trails" },
  { value: "any", label: "Any" },
] as const;

export function RouteControls({ value, onChange, onSubmit, loading }: Props) {
  const set = <K extends keyof RouteRequest>(key: K, next: RouteRequest[K]) =>
    onChange({ ...value, [key]: next });

  const nudge = (delta: number) =>
    set(
      "miles",
      Math.min(20, Math.max(0.5, Number((value.miles + delta).toFixed(1))))
    );

  return (
    <div className="controls">
      <div className="control-row">
        <span className="control-label">Distance</span>
        <div className="chips">
          <button
            className="chip stepper"
            onClick={() => nudge(-0.5)}
            aria-label="Shorter"
          >
            −
          </button>
          {DISTANCES.map((miles) => (
            <button
              key={miles}
              className={value.miles === miles ? "chip active" : "chip"}
              onClick={() => set("miles", miles)}
            >
              {miles}
            </button>
          ))}
          <button
            className="chip stepper"
            onClick={() => nudge(0.5)}
            aria-label="Longer"
          >
            +
          </button>
          <span className="chips-value">{value.miles.toFixed(1)} mi</span>
        </div>
      </div>

      <div className="control-row">
        <span className="control-label">Terrain</span>
        <div className="chips">
          {TERRAINS.map((option) => (
            <button
              key={option.value}
              className={
                value.terrain === option.value ? "chip active" : "chip"
              }
              onClick={() => set("terrain", option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="control-row">
        <span className="control-label">Roads</span>
        <div className="chips">
          {ROADS.map((option) => (
            <button
              key={option.value}
              className={value.roads === option.value ? "chip active" : "chip"}
              onClick={() => set("roads", option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <button className="primary" onClick={onSubmit} disabled={loading}>
        {loading ? "Finding routes…" : "Find routes"}
      </button>
    </div>
  );
}
