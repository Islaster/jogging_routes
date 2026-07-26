import type { RouteView } from "../api";

interface Props {
  routes: RouteView[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function RouteList({ routes, selectedId, onSelect }: Props) {
  if (!routes.length) return null;

  return (
    <ul className="route-list">
      {routes.map((r, i) => (
        <li
          key={r.id}
          className={r.id === selectedId ? "route selected" : "route"}
          onClick={() => onSelect(r.id)}
        >
          <div className="route-head">
            <span>Option {i + 1}</span>
            <span className="score">{Math.round(r.score * 100)}</span>
          </div>
          <div className="route-stats">
            <span>{r.miles.toFixed(2)} mi</span>
            <span>{Math.round(r.gainFt)} ft gain</span>
            <span>{Math.round(r.sideRoadRatio * 100)}% quiet</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
