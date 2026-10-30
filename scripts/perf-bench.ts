import { calculateLevels } from "../src/features/diagram/layout";
import { createRouteObstacleIndex, routeEdge } from "../src/features/diagram/edgeRouter";
import { getVisibleWorldRect, selectVisibleEdges } from "../src/features/diagram/viewportCulling";

import type {
  DiagramDirection,
  DiagramEdge,
  DiagramLayout,
  DiagramNode,
} from "../src/features/diagram/types";

function buildDiagram(nodeCount: number, crossEdgeRatio: number) {
  const columns = Math.ceil(Math.sqrt(nodeCount));

  const nodes: DiagramNode[] = [];
  const layout: DiagramLayout = {};

  for (let i = 0; i < nodeCount; i += 1) {
    const id = `n${i}`;

    nodes.push({ id, label: `Node ${i}`, shape: "rectangle" });

    const col = i % columns;
    const row = Math.floor(i / columns);

    layout[id] = {
      x: col * 220,
      y: row * 140,
      width: 160,
      height: 60,
    };
  }

  const edges: DiagramEdge[] = [];

  // Chain edges: each node to the next (typical flowchart shape).
  for (let i = 0; i < nodeCount - 1; i += 1) {
    edges.push({ id: `e-chain-${i}`, from: `n${i}`, to: `n${i + 1}` });
  }

  // Cross edges: some non-adjacent connections that force obstacle avoidance,
  // matching the kind of diagram a real user would actually draw (branches,
  // merges) rather than a pure straight line.
  const crossEdgeCount = Math.floor(nodeCount * crossEdgeRatio);

  for (let i = 0; i < crossEdgeCount; i += 1) {
    const from = Math.floor(Math.random() * nodeCount);
    const to = Math.floor(Math.random() * nodeCount);

    if (from === to) continue;

    edges.push({ id: `e-cross-${i}`, from: `n${from}`, to: `n${to}` });
  }

  return { nodes, edges, layout };
}

function benchmark(nodeCount: number, direction: DiagramDirection = "LR") {
  const { nodes, edges, layout } = buildDiagram(nodeCount, 0.15);
  const levels = calculateLevels(nodes, edges);

  const view = getVisibleWorldRect({ x: 0, y: 0 }, 1, 1920, 1080);

  const fullScan = () => {
    for (const edge of edges) {
      routeEdge(edge, layout, levels, direction);
    }
  };

  // What the canvas does per drag frame: rebuild the index, route every edge.
  const indexed = () => {
    const index = createRouteObstacleIndex(layout);

    for (const edge of edges) {
      routeEdge(edge, layout, levels, direction, index);
    }
  };

  // Same, but only for edges near a 1920x1080 viewport (viewport culling).
  const indexedAndCulled = () => {
    const index = createRouteObstacleIndex(layout);

    for (const edge of selectVisibleEdges(edges, layout, view)) {
      routeEdge(edge, layout, levels, direction, index);
    }
  };

  const measure = (work: () => void) => {
    work(); // warm up (JIT)

    const runs = 5;
    const start = performance.now();

    for (let run = 0; run < runs; run += 1) {
      work();
    }

    return (performance.now() - start) / runs;
  };

  const format = (ms: number) => ms.toFixed(2).padStart(8) + "ms";

  const full = measure(fullScan);
  const withIndex = measure(indexed);
  const culled = measure(indexedAndCulled);

  // eslint-disable-next-line no-console
  console.log(
    `nodes=${nodeCount.toString().padStart(5)}  edges=${edges.length.toString().padStart(5)}  ` +
      `full-scan=${format(full)}  indexed=${format(withIndex)}  indexed+culled=${format(culled)}  ` +
      `${culled > 16.67 ? "⚠️  below 60fps" : "ok"}`,
  );
}

// eslint-disable-next-line no-console
console.log("Simulating a full edge-reroute pass (what happens on every node drag frame):\n");

for (const nodeCount of [25, 50, 100, 200, 400, 800, 1500]) {
  benchmark(nodeCount);
}
