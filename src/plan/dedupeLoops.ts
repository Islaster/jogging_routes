import type { Loop } from "../search/types";

/** Drop loops built from the same set of edges, ignoring direction. */
export function dedupeLoops(loops: Loop[]): Loop[] {
  const seen = new Set<string>();

  return loops.filter((loop) => {
    const signature = [...loop.edgeIds].sort((a, b) => a - b).join(",");
    if (seen.has(signature)) return false;
    seen.add(signature);
    return true;
  });
}
