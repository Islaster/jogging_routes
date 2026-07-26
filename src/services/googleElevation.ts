import type { LatLng } from "../types";
import { M_TO_FT, decodePolyline, encodePolyline, sample } from "../geo";

export interface ElevationProfile {
  points: { point: LatLng; elevationM: number }[];
  gainFt: number;
  lossFt: number;
}

export function createElevationClient(apiKey: string, fetchImpl = fetch) {
  return {
    /**
     * Downsamples the route to `samples` points locally, then requests
     * elevation for exactly those points. Keeps the GET URL far under
     * the API's 16,384-char limit regardless of route length.
     */
    async profile(polyline: string, samples = 200): Promise<ElevationProfile> {
      const pts = sample(decodePolyline(polyline), samples);
      const enc = encodePolyline(pts);

      const url =
        `https://maps.googleapis.com/maps/api/elevation/json` +
        `?locations=enc:${encodeURIComponent(enc)}&key=${apiKey}`;

      const res = await fetchImpl(url);
      if (!res.ok) {
        throw new Error(
          `Elevation HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`
        );
      }
      const data = await res.json();
      if (data.status !== "OK") {
        throw new Error(
          `Elevation: ${data.status}${
            data.error_message ? ` — ${data.error_message}` : ""
          }`
        );
      }

      const points = data.results.map((r: any) => ({
        point: { lat: r.location.lat, lng: r.location.lng },
        elevationM: r.elevation,
      }));

      const smoothed = smooth(
        points.map((p: { elevationM: number }) => p.elevationM),
        3
      );
      let gain = 0,
        loss = 0;
      for (let i = 1; i < smoothed.length; i++) {
        const d = smoothed[i] - smoothed[i - 1];
        if (d > 0) gain += d;
        else loss -= d;
      }

      return { points, gainFt: gain * M_TO_FT, lossFt: loss * M_TO_FT };
    },
  };
}

function smooth(vals: number[], window: number): number[] {
  return vals.map((_, i) => {
    const lo = Math.max(0, i - window),
      hi = Math.min(vals.length, i + window + 1);
    const slice = vals.slice(lo, hi);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}
