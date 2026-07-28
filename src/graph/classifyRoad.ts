export const ROAD_QUIETNESS: Record<string, number> = {
  footway: 1.0,
  path: 1.0,
  pedestrian: 1.0,
  track: 0.95,
  cycleway: 0.95,
  living_street: 0.9,
  residential: 0.85,
  tertiary: 0.7,
  service: 0.7,
  unclassified: 0.6,
  secondary: 0.2,
  primary: 0.05,
  trunk: 0.05,
};

/** Classes that are arterials however their lanes happen to be tagged. */
const MAJOR_CLASSES = new Set(["trunk", "primary", "secondary"]);

/** Is this a way a person would actually run along? */
export function isJoggable(tags: Record<string, string>): boolean {
  const type = tags?.highway;
  if (!type || !(type in ROAD_QUIETNESS)) return false;

  if (tags.footway === "sidewalk") return false; // duplicate of its roadway
  if (tags.footway === "crossing") return false; // mid-block crosswalk
  if (tags.service === "parking_aisle") return false;
  if (tags.service === "driveway") return false;
  if (tags.area === "yes") return false; // plazas aren't linear
  if (tags.access === "private" || tags.access === "no") return false;
  if (tags.indoor === "yes" || tags.covered === "yes") return false;

  return true;
}

/** Total lanes to cross. Falls back to road class when untagged. */
export function laneCount(tags: Record<string, string>): number {
  const explicit = Number(tags.lanes);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const forward = Number(tags["lanes:forward"]);
  const backward = Number(tags["lanes:backward"]);
  if (Number.isFinite(forward) || Number.isFinite(backward)) {
    return (
      (Number.isFinite(forward) ? forward : 1) +
      (Number.isFinite(backward) ? backward : 1)
    );
  }

  if (MAJOR_CLASSES.has(tags.highway)) return 4;
  return 2;
}

/** How pleasant is this to run on, 0..1. */
export function quietnessOf(tags: Record<string, string>): number {
  const base = ROAD_QUIETNESS[tags.highway] ?? 0.5;
  if (tags.service === "alley") return base * 0.5;
  if (tags.highway === "service") return base * 0.8;
  return base;
}

/**
 * Small enough to run on and to cross freely.
 * OSM splits divided roads into one-way carriageways, so a 4-lane boulevard
 * can appear as two 2-lane ways — hence the class check alongside lanes.
 */
export function isCrossable(type: string, lanes: number): boolean {
  return lanes < 3 && !MAJOR_CLASSES.has(type);
}
