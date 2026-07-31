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
      {routes.map((route, index) => (
        <li
          key={route.id}
          className={route.id === selectedId ? "route selected" : "route"}
          onClick={() => onSelect(route.id)}
        >
          <div className="route-head">
            <span>Option {index + 1}</span>
            <span className="score">{Math.round(route.score * 100)}</span>
          </div>
          <div className="route-stats">
            <span>{route.miles.toFixed(2)} mi</span>
            <span>{Math.round(route.gainFt)} ft</span>
            <span>{Math.round(route.sideRoadRatio * 100)}% quiet</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
