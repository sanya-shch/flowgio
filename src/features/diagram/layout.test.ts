import { describe, expect, it } from "vitest";

import { calculateLevels } from "./layout";
import type { DiagramEdge, DiagramNode } from "./types";

function makeNodes(ids: string[]): DiagramNode[] {
  return ids.map((id) => ({ id, label: id, shape: "rectangle" }));
}

function makeEdges(pairs: Array<[string, string]>): DiagramEdge[] {
  return pairs.map(([from, to], index) => ({ id: `e${index}`, from, to }));
}

describe("calculateLevels", () => {
  it("assigns longest-path levels, including through already visited nodes", () => {
    const levels = calculateLevels(
      makeNodes(["A", "B", "C", "D"]),
      makeEdges([
        ["A", "C"],
        ["A", "B"],
        ["B", "C"],
        ["C", "D"],
      ]),
    );

    expect(Object.fromEntries(levels)).toEqual({ A: 0, B: 1, C: 2, D: 3 });
  });

  it("ignores edges that close a cycle", () => {
    const levels = calculateLevels(
      makeNodes(["A", "B", "C"]),
      makeEdges([
        ["A", "B"],
        ["B", "C"],
        ["C", "A"],
      ]),
    );

    expect(Object.fromEntries(levels)).toEqual({ A: 0, B: 1, C: 2 });
  });

  it("handles self loops and disconnected nodes", () => {
    const levels = calculateLevels(makeNodes(["A", "B"]), makeEdges([["A", "A"]]));

    expect(Object.fromEntries(levels)).toEqual({ A: 0, B: 0 });
  });

  it("does not overflow the call stack on very long chains", () => {
    const size = 50_000;
    const ids = Array.from({ length: size }, (_, index) => `n${index}`);
    const pairs: Array<[string, string]> = ids.slice(1).map((id, index) => [ids[index]!, id]);

    const levels = calculateLevels(makeNodes(ids), makeEdges(pairs));

    expect(levels.get("n0")).toBe(0);
    expect(levels.get(`n${size - 1}`)).toBe(size - 1);
  });
});
