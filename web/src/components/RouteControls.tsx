import type { RouteRequest } from "../api";

interface Props {
  value: RouteRequest;
  onChange: (next: RouteRequest) => void;
  onSubmit: () => void;
  loading: boolean;
}

const TERRAINS = ["flat", "rolling", "hilly"] as const;
const ROADS = [
  { value: "side-roads", label: "Side roads" },
  { value: "trails", label: "Trails" },
  { value: "any", label: "Any" },
] as const;

export function RouteControls({ value, onChange, onSubmit, loading }: Props) {
  const set = <K extends keyof RouteRequest>(k: K, v: RouteRequest[K]) =>
    onChange({ ...value, [k]: v });

  return (
    <div className="controls">
      <label>
        Distance: <strong>{value.miles.toFixed(1)} mi</strong>
        <input
          type="range"
          min={1}
          max={20}
          step={0.5}
          value={value.miles}
          onChange={(e) => set("miles", Number(e.target.value))}
        />
      </label>

      <fieldset>
        <legend>Terrain</legend>
        {TERRAINS.map((t) => (
          <button
            key={t}
            className={value.terrain === t ? "chip active" : "chip"}
            onClick={() => set("terrain", t)}
          >
            {t}
          </button>
        ))}
      </fieldset>

      <fieldset>
        <legend>Roads</legend>
        {ROADS.map((r) => (
          <button
            key={r.value}
            className={value.roads === r.value ? "chip active" : "chip"}
            onClick={() => set("roads", r.value)}
          >
            {r.label}
          </button>
        ))}
      </fieldset>

      <button className="primary" onClick={onSubmit} disabled={loading}>
        {loading ? "Finding routes…" : "Find routes"}
      </button>
    </div>
  );
}
