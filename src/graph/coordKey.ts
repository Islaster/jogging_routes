/** Stable string key for a coordinate, so shared points match exactly. */
export function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(7)},${lng.toFixed(7)}`;
}
