import { AdvancedMarker } from "@vis.gl/react-google-maps";
import type { LatLng } from "../api";

interface Props {
  pins: LatLng[];
  onMove: (index: number, pos: LatLng) => void;
}

export function EditHandles({ pins, onMove }: Props) {
  return (
    <>
      {pins.map((p, i) => (
        <AdvancedMarker
          key={i}
          position={p}
          draggable
          onDragEnd={(e) => {
            const ll = e.latLng;
            if (ll) onMove(i, { lat: ll.lat(), lng: ll.lng() });
          }}
        >
          <div className="edit-handle">{i + 1}</div>
        </AdvancedMarker>
      ))}
    </>
  );
}
