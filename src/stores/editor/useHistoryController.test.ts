import { describe, expect, it } from "vitest";

import type { DiagramDocument } from "@/features/diagram/types";

import {
  HISTORY_MAX_WEIGHT,
  estimateDocumentWeight,
  useHistoryController,
} from "./useHistoryController";

function documentWith(nodeCount: number, edgeCount: number): DiagramDocument {
  return {
    direction: "LR",
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      id: `n${index}`,
      label: `Node ${index}`,
      shape: "rectangle" as const,
    })),
    edges: Array.from({ length: edgeCount }, (_, index) => ({
      id: `e${index}`,
      from: "n0",
      to: "n1",
    })),
    layout: {},
    sourceMap: {},
  };
}

function countUndoSteps(controller: ReturnType<typeof useHistoryController>): number {
  let steps = 0;
  let current = documentWith(1, 0);

  while (controller.canUndo.value) {
    const previous = controller.undo(current);

    if (!previous) {
      break;
    }

    current = previous;
    steps += 1;
  }

  return steps;
}

describe("useHistoryController memory budget", () => {
  it("keeps the full 100 steps for small diagrams", () => {
    const controller = useHistoryController();

    for (let index = 0; index < 150; index += 1) {
      controller.push(documentWith(30, 40));
    }

    expect(countUndoSteps(controller)).toBe(100);
  });

  it("keeps far fewer steps for diagrams at the input limits", () => {
    const controller = useHistoryController();
    const snapshot = documentWith(3_000, 6_000);

    for (let index = 0; index < 100; index += 1) {
      controller.push(snapshot);
    }

    const steps = countUndoSteps(controller);

    expect(steps).toBeGreaterThanOrEqual(1);
    expect(steps * estimateDocumentWeight(snapshot)).toBeLessThanOrEqual(HISTORY_MAX_WEIGHT);
    expect(steps).toBeLessThan(20);
  });

  it("still allows one undo for an enormous document", () => {
    const controller = useHistoryController();

    controller.push(documentWith(50_000, 100_000));

    expect(controller.canUndo.value).toBe(true);
  });
});
