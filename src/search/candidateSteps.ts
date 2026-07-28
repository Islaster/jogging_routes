import { bearingBetween, bearingDelta } from "../geo/bearing";
import type { RoadGraph } from "../graph/RoadGraph";
import type { Step } from "./types";

const STRAIGHT_THRESHOLD_DEG = 30;

/** Every edge leaving `node`, described as a step. No filtering. */
export function candidateSteps(
  graph: RoadGraph,
  node: number,
  previousEdge: number | undefined
): Step[] {
  const here = graph.nodes[node];
  const incoming = incomingBearing(graph, node, previousEdge);

  return here.edges.map((edgeId) => {
    const toNode = graph.other(edgeId, node);
    const to = graph.nodes[toNode];
    const outgoing = bearingBetween(
      { lat: here.lat, lng: here.lng },
      { lat: to.lat, lng: to.lng }
    );
    const turnDeg =
      incoming === null ? 90 : Math.abs(bearingDelta(incoming, outgoing));

    return {
      edgeId,
      toNode,
      meters: graph.edges[edgeId].meters,
      turnDeg,
      isStraight: turnDeg < STRAIGHT_THRESHOLD_DEG,
    };
  });
}

function incomingBearing(
  graph: RoadGraph,
  node: number,
  previousEdge: number | undefined
): number | null {
  if (previousEdge === undefined) return null;
  const from = graph.nodes[graph.other(previousEdge, node)];
  const here = graph.nodes[node];
  return bearingBetween(
    { lat: from.lat, lng: from.lng },
    { lat: here.lat, lng: here.lng }
  );
}
