import { describe, expect, it } from "vitest";

import { createRouteObstacleIndex, routeEdge } from "./edgeRouter";
import { calculateLevels } from "./layout";
import { parseDiagram } from "./parser";

/*
 * Two nodes share the bottom row with the node that loops back, so both side
 * corridors of the TD back edge are blocked. The edge used to get a null route
 * and silently vanished from the canvas.
 */
const BINARY_SEARCH = `flowchart TD
Start -> Init["low = 0, high = n - 1"]
Init -> Cond["low <= high?"]
Cond -- "no" -> NotFound["Return -1"]
Cond -- "yes" -> Mid["mid = (low + high) / 2"]
Mid -> Check["arr[mid] == target?"]
Check -- "yes" -> Found["Return mid"]
Check -- "no" -> Less["arr[mid] < target?"]
Less -- "yes" -> SetLow["low = mid + 1"]
Less -- "no" -> SetHigh["high = mid - 1"]
SetLow -> Cond
SetHigh -> Cond
Found -> End
NotFound -> End
`;

describe("TD back edges", () => {
  const { document, errors } = parseDiagram(BINARY_SEARCH);
  const levels = calculateLevels(document.nodes, document.edges);

  it("parses the sample without errors", () => {
    expect(errors).toEqual([]);
  });

  it("never drops an edge when both side corridors are blocked", () => {
    for (const edge of document.edges) {
      expect(routeEdge(edge, document.layout, levels, "TD")).not.toBeNull();
    }
  });

  it("routes the same way with a spatial index", () => {
    const index = createRouteObstacleIndex(document.layout);

    for (const edge of document.edges) {
      expect(routeEdge(edge, document.layout, levels, "TD", index)).toEqual(
        routeEdge(edge, document.layout, levels, "TD"),
      );
    }
  });
});
