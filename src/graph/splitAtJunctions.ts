import { coordKey } from "./coordKey";
import type { EdgeSpec, ParsedWay } from "./types";

/** Ways → one edge per junction-to-junction stretch. */
export function splitAtJunctions(
  ways: ParsedWay[],
  junctions: Set<string>
): EdgeSpec[] {
  const specs: EdgeSpec[] = [];

  for (const way of ways) {
    let sliceStart = 0;

    for (let i = 1; i < way.geometry.length; i++) {
      const point = way.geometry[i];
      const isJunction = junctions.has(coordKey(point.lat, point.lng));
      const isLast = i === way.geometry.length - 1;
      if (!isJunction && !isLast) continue;

      specs.push({
        geometry: way.geometry.slice(sliceStart, i + 1),
        type: way.type,
        lanes: way.lanes,
        quietness: way.quietness,
        crossable: way.crossable,
        sidewalkSides: way.sidewalkSides,
      });
      sliceStart = i;
    }
  }

  return specs;
}
