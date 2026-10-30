import { describe, expect, it } from "vitest";

import { createRouteObstacleIndex, routeEdge } from "./edgeRouter";
import { calculateLevels } from "./layout";
import { createObstacleIndex } from "./obstacleIndex";
import type { DiagramDirection, DiagramEdge, DiagramLayout, DiagramNode } from "./types";

// Small deterministic PRNG so failures are reproducible.
function createRandom(seed: number) {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;

    return state / 4294967296;
  };
}

function buildRandomDiagram(seed: number, nodeCount: number, spread: number) {
  const random = createRandom(seed);

  const nodes: DiagramNode[] = [];
  const layout: DiagramLayout = {};

  for (let index = 0; index < nodeCount; index += 1) {
    const id = `n${index}`;

    nodes.push({ id, label: id, shape: "rectangle" });

    layout[id] = {
      x: Math.round((random() - 0.3) * spread),
      y: Math.round((random() - 0.3) * spread),
      width: 60 + Math.round(random() * 300),
      height: 40 + Math.round(random() * 120),
    };
  }

  const edges: DiagramEdge[] = [];

  for (let index = 0; index < nodeCount * 2; index += 1) {
    edges.push({
      id: `e${index}`,
      from: `n${Math.floor(random() * nodeCount)}`,
      to: `n${Math.floor(random() * nodeCount)}`,
    });
  }

  return { nodes, edges, layout };
}

describe("routeEdge with an obstacle index", () => {
  const scenarios: Array<[number, number, number, DiagramDirection]> = [];

  for (let seed = 1; seed <= 60; seed += 1) {
    // Mix of dense (many overlaps / detours) and sparse layouts.
    scenarios.push([
      seed,
      6 + (seed % 30),
      seed % 3 === 0 ? 600 : seed % 3 === 1 ? 1500 : 6000,
      seed % 2 ? "LR" : "TD",
    ]);
  }

  it.each(scenarios)(
    "produces exactly the same routes as the full scan (seed %i, %i nodes, spread %i, %s)",
    (seed, nodeCount, spread, direction) => {
      const { nodes, edges, layout } = buildRandomDiagram(seed, nodeCount, spread);
      const levels = calculateLevels(nodes, edges);
      const index = createRouteObstacleIndex(layout);

      for (const edge of edges) {
        expect(routeEdge(edge, layout, levels, direction, index)).toEqual(
          routeEdge(edge, layout, levels, direction),
        );
      }
    },
  );
});

describe("createObstacleIndex", () => {
  const layout = {
    a: { x: 0, y: 0, width: 100, height: 50 },
    b: { x: 5000, y: 5000, width: 100, height: 50 },
    c: { x: -3000, y: -3000, width: 600, height: 600 },
  };

  it("returns nearby nodes only and honours exclusions", () => {
    const index = createObstacleIndex(layout, 10);

    const near = index.query({ x: -50, y: -50, width: 300, height: 300 }, "zzz", "zzz");

    expect(near).toHaveLength(1);
    expect(near[0]).toEqual({ x: -10, y: -10, width: 120, height: 70 });

    expect(index.query({ x: -50, y: -50, width: 300, height: 300 }, "a", "zzz")).toHaveLength(0);
  });

  it("handles nodes spanning many cells without duplicates", () => {
    const index = createObstacleIndex(layout, 0);

    const result = index.query({ x: -3000, y: -3000, width: 600, height: 600 }, "x", "y");

    expect(result).toHaveLength(1);
  });

  it("all() returns every node except the excluded ones", () => {
    const index = createObstacleIndex(layout, 0);

    expect(index.all("a", "b")).toHaveLength(1);
    expect(index.all("x", "y")).toHaveLength(3);
  });
});
