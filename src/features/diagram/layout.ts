import type { DiagramDirection, DiagramEdge, DiagramLayout, DiagramNode } from "./types";

import { calculateNodeSize } from "./nodeSizing";

const HORIZONTAL_GAP = 100;
const VERTICAL_GAP = 100;

const START_X = 100;
const START_Y = 100;

/*
 * Assigns every node a level equal to the longest path from a root.
 *
 * Both phases are iterative on purpose: diagrams can come from untrusted
 * share links / files, and a recursive DFS overflows the call stack on a
 * chain of a few thousand nodes.
 *
 * 1. Iterative DFS classifies back edges (edges to a node that is still on the
 *    DFS stack). They close cycles and are ignored for levelling.
 * 2. The remaining graph is a DAG, so Kahn's algorithm gives exact longest-path
 *    levels in O(N + E).
 */
export function calculateLevels(nodes: DiagramNode[], edges: DiagramEdge[]): Map<string, number> {
  const outgoing = new Map<string, string[]>();

  for (const node of nodes) {
    outgoing.set(node.id, []);
  }

  for (const edge of edges) {
    if (outgoing.has(edge.to)) {
      outgoing.get(edge.from)?.push(edge.to);
    }
  }

  const ON_STACK = 1;
  const DONE = 2;

  const state = new Map<string, number>();
  const acyclicOutgoing = new Map<string, string[]>();
  const indegree = new Map<string, number>();

  for (const node of nodes) {
    acyclicOutgoing.set(node.id, []);
    indegree.set(node.id, 0);
  }

  for (const root of nodes) {
    if (state.has(root.id)) {
      continue;
    }

    state.set(root.id, ON_STACK);

    const stack: Array<{ id: string; next: number }> = [{ id: root.id, next: 0 }];

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]!;
      const targets = outgoing.get(frame.id) ?? [];

      if (frame.next >= targets.length) {
        state.set(frame.id, DONE);
        stack.pop();
        continue;
      }

      const targetId = targets[frame.next]!;

      frame.next += 1;

      if (state.get(targetId) === ON_STACK) {
        continue;
      }

      acyclicOutgoing.get(frame.id)?.push(targetId);
      indegree.set(targetId, (indegree.get(targetId) ?? 0) + 1);

      if (!state.has(targetId)) {
        state.set(targetId, ON_STACK);
        stack.push({ id: targetId, next: 0 });
      }
    }
  }

  const levels = new Map<string, number>();
  const queue: string[] = [];

  for (const node of nodes) {
    if (indegree.get(node.id) === 0) {
      levels.set(node.id, 0);
      queue.push(node.id);
    }
  }

  for (let head = 0; head < queue.length; head += 1) {
    const nodeId = queue[head]!;
    const nextLevel = (levels.get(nodeId) ?? 0) + 1;

    for (const targetId of acyclicOutgoing.get(nodeId) ?? []) {
      if (nextLevel > (levels.get(targetId) ?? 0)) {
        levels.set(targetId, nextLevel);
      }

      const remaining = (indegree.get(targetId) ?? 0) - 1;

      indegree.set(targetId, remaining);

      if (remaining === 0) {
        queue.push(targetId);
      }
    }
  }

  return levels;
}

function findNextAvailableOffset(
  occupied: Array<{
    start: number;
    end: number;
  }>,
  size: number,
  gap: number,
): number {
  if (occupied.length === 0) {
    return 0;
  }

  const sorted = [...occupied].sort((a, b) => a.start - b.start);

  let offset = 0;

  for (const item of sorted) {
    if (offset + size <= item.start - gap) {
      return offset;
    }

    offset = Math.max(offset, item.end + gap);
  }

  return offset;
}

interface LevelSize {
  width: number;
  height: number;
}

export function createNodeLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: DiagramDirection,
  previousLayout: DiagramLayout,
  preservePositions: boolean,
): DiagramLayout {
  const levels = calculateLevels(nodes, edges);

  const nodeSizes = new Map<string, { width: number; height: number }>();

  for (const node of nodes) {
    nodeSizes.set(node.id, calculateNodeSize(node.label));
  }

  const nodesByLevel = new Map<number, DiagramNode[]>();

  for (const node of nodes) {
    const level = levels.get(node.id) ?? 0;

    const levelNodes = nodesByLevel.get(level) ?? [];

    levelNodes.push(node);

    nodesByLevel.set(level, levelNodes);
  }

  const levelSizes = new Map<number, LevelSize>();

  for (const [level, levelNodes] of nodesByLevel) {
    let width = 0;
    let height = 0;

    for (const node of levelNodes) {
      const size = nodeSizes.get(node.id);

      if (!size) {
        continue;
      }

      width = Math.max(width, size.width);

      height = Math.max(height, size.height);
    }

    levelSizes.set(level, {
      width,
      height,
    });
  }

  const layout: DiagramLayout = {};

  let maxLevel = 0;

  for (const level of nodesByLevel.keys()) {
    if (level > maxLevel) {
      maxLevel = level;
    }
  }

  let primaryOffset = direction === "LR" ? START_X : START_Y;

  for (let level = 0; level <= maxLevel; level += 1) {
    const levelNodes = nodesByLevel.get(level) ?? [];

    if (levelNodes.length === 0) {
      continue;
    }

    const levelSize = levelSizes.get(level);

    if (!levelSize) {
      continue;
    }

    const occupied: Array<{
      start: number;
      end: number;
    }> = [];

    for (const node of levelNodes) {
      const size = nodeSizes.get(node.id);

      if (!size) {
        continue;
      }

      const previous = Object.hasOwn(previousLayout, node.id) ? previousLayout[node.id] : undefined;

      if (preservePositions && previous) {
        layout[node.id] = {
          ...previous,
          width: size.width,
          height: size.height,
        };

        const crossStart = direction === "LR" ? previous.y : previous.x;

        const crossSize = direction === "LR" ? previous.height : previous.width;

        occupied.push({
          start: crossStart,
          end: crossStart + crossSize,
        });
      }
    }

    for (const node of levelNodes) {
      if (layout[node.id]) {
        continue;
      }

      const size = nodeSizes.get(node.id);

      if (!size) {
        continue;
      }

      const crossSize = direction === "LR" ? size.height : size.width;

      const crossOffset = findNextAvailableOffset(
        occupied,
        crossSize,
        direction === "LR" ? VERTICAL_GAP : HORIZONTAL_GAP,
      );

      const position =
        direction === "LR"
          ? {
              x: primaryOffset,
              y: START_Y + crossOffset,
            }
          : {
              x: START_X + crossOffset,
              y: primaryOffset,
            };

      layout[node.id] = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
      };

      occupied.push({
        start: direction === "LR" ? position.y : position.x,
        end: direction === "LR" ? position.y + size.height : position.x + size.width,
      });
    }

    primaryOffset +=
      direction === "LR" ? levelSize.width + HORIZONTAL_GAP : levelSize.height + VERTICAL_GAP;
  }

  return layout;
}
