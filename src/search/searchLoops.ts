import { mulberry32 } from "../geo/random";
import { distancesFrom } from "./reachability";
import { walkOnce } from "./walkOnce";
import type { RoadGraph } from "../graph/RoadGraph";
import type { Loop, RoadPref, Terrain } from "./types";
import { loopShape } from "./loopShape";
import { newTrace, printTrace } from "./trace";
import { walkOutAndBack } from "./walkOutAndBack";

const BEARING_COUNT = 16;

export interface SearchOptions {
  attempts?: number;
  tolerance?: number;
  seed?: number;
  avoidStoplights?: boolean;
}

interface BearingTally {
  tried: number;
  found: number;
}

/** Run many independent walks, spread around the compass; keep the ones that closed. */
export function searchLoops(
  graph: RoadGraph,
  startNode: number,
  targetM: number,
  roads: RoadPref,
  terrain: Terrain,
  options: SearchOptions = {}
): Loop[] {
  const {
    attempts = 400,
    tolerance = 0.12,
    seed = 20260726,
    avoidStoplights = false,
  } = options;
  const homeDistances = distancesFrom(graph, startNode, roads);

  const loops: Loop[] = [];
  const tallies = new Map<number, BearingTally>();

  for (let i = 0; i < attempts; i++) {
    const bearing = ((i % BEARING_COUNT) * 360) / BEARING_COUNT;
    const tally = tallyFor(tallies, bearing);
    tally.tried++;

    // Trace the first walk at four cardinal bearings.
    const shouldTrace = i < BEARING_COUNT && i % 4 === 0;
    const trace = shouldTrace ? newTrace(bearing) : undefined;

    const loop = walkOnce({
      graph,
      startNode,
      targetM,
      tolerance,
      homeDistances,
      // Independent stream per walk — sharing one correlates later walks
      // with earlier ones and collapses variety.
      random: mulberry32(seed + i * 7919),
      roads,
      terrain,
      outboundBearingDeg: bearing,
      avoidStoplights,
      trace,
    });

    if (trace) printTrace(trace);

    if (loop) {
      loops.push(loop);
      tally.found++;
    }
  }

  logBearingYield(tallies);
  logLoopSpread(graph, startNode, loops, attempts);

  if (loops.length >= 3 || roads !== "trails") return loops;

  console.log("  no loops closed — falling back to out-and-back");
  return searchOutAndBack(graph, startNode, targetM, roads, terrain, options);
}

function searchOutAndBack(
  graph: RoadGraph,
  startNode: number,
  targetM: number,
  roads: RoadPref,
  terrain: Terrain,
  options: SearchOptions
): Loop[] {
  const {
    attempts = 400,
    tolerance = 0.12,
    seed = 20260726,
    avoidStoplights = false,
  } = options;
  const homeDistances = distancesFrom(graph, startNode, roads);

  const routes: Loop[] = [];
  for (let i = 0; i < attempts; i++) {
    const route = walkOutAndBack({
      graph,
      startNode,
      targetM,
      tolerance,
      homeDistances,
      random: mulberry32(seed + i * 7919),
      roads,
      terrain,
      outboundBearingDeg: ((i % BEARING_COUNT) * 360) / BEARING_COUNT,
      avoidStoplights,
    });
    if (route) routes.push({ ...route, shape: "out-and-back" });
  }

  console.log(`  out-and-back: ${routes.length}/${attempts} found`);
  return routes;
}

function tallyFor(
  tallies: Map<number, BearingTally>,
  bearing: number
): BearingTally {
  let tally = tallies.get(bearing);
  if (!tally) {
    tally = { tried: 0, found: 0 };
    tallies.set(bearing, tally);
  }
  return tally;
}

/** Which outbound directions actually produce loops. */
function logBearingYield(tallies: Map<number, BearingTally>): void {
  const summary = [...tallies]
    .sort((a, b) => a[0] - b[0])
    .map(([bearing, tally]) => `${bearing}°:${tally.found}/${tally.tried}`)
    .join(" ");

  console.log(`  yield by bearing: ${summary}`);
}

/** Which directions the finished loops actually head. */
function logLoopSpread(
  graph: RoadGraph,
  startNode: number,
  loops: Loop[],
  attempts: number
): void {
  const start = graph.nodes[startNode];
  const point = { lat: start.lat, lng: start.lng };

  const distinct = new Map<string, Loop>();
  for (const loop of loops) {
    const signature = [...loop.edgeIds].sort((a, b) => a - b).join(",");
    if (!distinct.has(signature)) distinct.set(signature, loop);
  }

  console.log(`  found ${loops.length}/${attempts}, ${distinct.size} distinct`);

  for (const loop of [...distinct.values()].slice(0, 10)) {
    const shape = loopShape(loop, point);
    console.log(
      `    ${Math.round(loop.meters)}m  ` +
        `bulk ${Math.round(shape.centroidBearingDeg)}°@${Math.round(
          shape.centroidDistanceM
        )}m  ` +
        `far ${Math.round(shape.farthestBearingDeg)}°@${Math.round(
          shape.farthestDistanceM
        )}m  ` +
        `${loop.edgeIds.length} edges`
    );
  }
}
