import { createObstacleIndex, type ObstacleIndex } from "./obstacleIndex";
import type { DiagramDirection, DiagramEdge, DiagramLayout } from "./types";

export type { ObstacleIndex };

export interface EdgePoint {
  x: number;
  y: number;
}

export interface EdgeRoute {
  points: EdgePoint[];
  type: "direct" | "orthogonal" | "loop";
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ROUTE_GAP = 32;
const NODE_GAP = 16;

/*
 * Spatial index for routeEdge. Build it once per layout and share it between
 * all edges: it turns the per-edge obstacle lookup from O(nodes) into roughly
 * O(nodes near the edge).
 */
export function createRouteObstacleIndex(layout: DiagramLayout): ObstacleIndex {
  return createObstacleIndex(layout, NODE_GAP);
}

/*
 * Direct and orthogonal candidates stay inside the bounding box of the two
 * endpoints plus ROUTE_GAP, and obstacles are padded by NODE_GAP, so nodes
 * further away than this can never block them. Back edges wrap around the
 * whole diagram and therefore always use every node.
 */
const ROUTE_REACH = ROUTE_GAP + NODE_GAP + 1;

function getRect(layout: DiagramLayout, nodeId: string): Rect | null {
  const rect = layout[nodeId];

  if (!rect) {
    return null;
  }

  return rect;
}

function expandRect(rect: Rect, gap: number): Rect {
  return {
    x: rect.x - gap,
    y: rect.y - gap,
    width: rect.width + gap * 2,
    height: rect.height + gap * 2,
  };
}

function pointInsideRect(point: EdgePoint, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

function orientation(a: EdgePoint, b: EdgePoint, c: EdgePoint): number {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);

  if (Math.abs(value) < 0.0001) {
    return 0;
  }

  return value > 0 ? 1 : 2;
}

function onSegment(a: EdgePoint, b: EdgePoint, c: EdgePoint): boolean {
  return (
    b.x >= Math.min(a.x, c.x) &&
    b.x <= Math.max(a.x, c.x) &&
    b.y >= Math.min(a.y, c.y) &&
    b.y <= Math.max(a.y, c.y)
  );
}

function segmentsIntersect(p1: EdgePoint, q1: EdgePoint, p2: EdgePoint, q2: EdgePoint): boolean {
  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  if (o1 === 0 && onSegment(p1, p2, q1)) {
    return true;
  }

  if (o2 === 0 && onSegment(p1, q2, q1)) {
    return true;
  }

  if (o3 === 0 && onSegment(p2, p1, q2)) {
    return true;
  }

  if (o4 === 0 && onSegment(p2, q1, q2)) {
    return true;
  }

  return false;
}

function segmentIntersectsRect(start: EdgePoint, end: EdgePoint, rect: Rect): boolean {
  if (pointInsideRect(start, rect) || pointInsideRect(end, rect)) {
    return true;
  }

  const topLeft: EdgePoint = {
    x: rect.x,
    y: rect.y,
  };

  const topRight: EdgePoint = {
    x: rect.x + rect.width,
    y: rect.y,
  };

  const bottomRight: EdgePoint = {
    x: rect.x + rect.width,
    y: rect.y + rect.height,
  };

  const bottomLeft: EdgePoint = {
    x: rect.x,
    y: rect.y + rect.height,
  };

  return (
    segmentsIntersect(start, end, topLeft, topRight) ||
    segmentsIntersect(start, end, topRight, bottomRight) ||
    segmentsIntersect(start, end, bottomRight, bottomLeft) ||
    segmentsIntersect(start, end, bottomLeft, topLeft)
  );
}

function countBlockedObstacles(points: EdgePoint[], obstacles: Rect[]): number {
  let blocked = 0;

  for (const obstacle of obstacles) {
    for (let index = 0; index < points.length - 1; index += 1) {
      if (segmentIntersectsRect(points[index]!, points[index + 1]!, obstacle)) {
        blocked += 1;

        break;
      }
    }
  }

  return blocked;
}

function routeIntersectsNodes(points: EdgePoint[], obstacles: Rect[]): boolean {
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];

    for (const obstacle of obstacles) {
      if (segmentIntersectsRect(start, end, obstacle)) {
        return true;
      }
    }
  }

  return false;
}

function getSourcePoint(
  rect: Rect,
  direction: DiagramDirection,
  side: "forward" | "back",
): EdgePoint {
  if (direction === "LR") {
    if (side === "forward") {
      return {
        x: rect.x + rect.width,
        y: rect.y + rect.height / 2,
      };
    }

    return {
      x: rect.x + rect.width / 2,
      y: rect.y,
    };
  }

  if (side === "forward") {
    return {
      x: rect.x + rect.width / 2,
      y: rect.y + rect.height,
    };
  }

  return {
    x: rect.x,
    y: rect.y + rect.height / 2,
  };
}

function getTargetPoint(
  rect: Rect,
  direction: DiagramDirection,
  side: "forward" | "back",
): EdgePoint {
  if (direction === "LR") {
    if (side === "forward") {
      return {
        x: rect.x,
        y: rect.y + rect.height / 2,
      };
    }

    return {
      x: rect.x + rect.width / 2,
      y: rect.y,
    };
  }

  if (side === "forward") {
    return {
      x: rect.x + rect.width / 2,
      y: rect.y,
    };
  }

  return {
    x: rect.x,
    y: rect.y + rect.height / 2,
  };
}

function createDirectRoute(
  from: Rect,
  to: Rect,
  direction: DiagramDirection,
  obstacles: Rect[],
): EdgeRoute | null {
  const start = getSourcePoint(from, direction, "forward");

  const end = getTargetPoint(to, direction, "forward");

  if (routeIntersectsNodes([start, end], obstacles)) {
    return null;
  }

  return {
    type: "direct",
    points: [start, end],
  };
}

function createLRRoute(from: Rect, to: Rect, obstacles: Rect[]): EdgeRoute | null {
  const start = getSourcePoint(from, "LR", "forward");

  const end = getTargetPoint(to, "LR", "forward");

  const rightX = Math.max(from.x + from.width, to.x + to.width) + ROUTE_GAP;

  const leftX = Math.min(from.x, to.x) - ROUTE_GAP;

  const candidates: EdgeRoute[] = [
    {
      type: "orthogonal",
      points: [
        start,
        {
          x: rightX,
          y: start.y,
        },
        {
          x: rightX,
          y: end.y,
        },
        end,
      ],
    },
    {
      type: "orthogonal",
      points: [
        start,
        {
          x: leftX,
          y: start.y,
        },
        {
          x: leftX,
          y: end.y,
        },
        end,
      ],
    },
  ];

  return candidates.find((candidate) => !routeIntersectsNodes(candidate.points, obstacles)) ?? null;
}

function createTDRoute(from: Rect, to: Rect, obstacles: Rect[]): EdgeRoute | null {
  const start = getSourcePoint(from, "TD", "forward");

  const end = getTargetPoint(to, "TD", "forward");

  const bottomY = Math.max(from.y + from.height, to.y + to.height) + ROUTE_GAP;

  const topY = Math.min(from.y, to.y) - ROUTE_GAP;

  const candidates: EdgeRoute[] = [
    {
      type: "orthogonal",
      points: [
        start,
        {
          x: start.x,
          y: bottomY,
        },
        {
          x: end.x,
          y: bottomY,
        },
        end,
      ],
    },
    {
      type: "orthogonal",
      points: [
        start,
        {
          x: start.x,
          y: topY,
        },
        {
          x: end.x,
          y: topY,
        },
        end,
      ],
    },
  ];

  return candidates.find((candidate) => !routeIntersectsNodes(candidate.points, obstacles)) ?? null;
}

function createBackEdgeLRRoute(from: Rect, to: Rect, obstacles: Rect[]): EdgeRoute {
  const start = getSourcePoint(from, "LR", "back");
  const end = getTargetPoint(to, "LR", "back");

  const allRects = [from, to, ...obstacles];

  const topY = Math.min(...allRects.map((rect) => rect.y)) - ROUTE_GAP * 2;

  return {
    type: "orthogonal",
    points: [start, { x: start.x, y: topY }, { x: end.x, y: topY }, end],
  };
}

function createBackEdgeTDRoute(from: Rect, to: Rect, obstacles: Rect[]): EdgeRoute {
  const start = getSourcePoint(from, "TD", "back");

  const end = getTargetPoint(to, "TD", "back");

  const leftX = Math.min(from.x, to.x, ...obstacles.map((rect) => rect.x)) - ROUTE_GAP * 2;

  const rightX =
    Math.max(
      from.x + from.width,
      to.x + to.width,
      ...obstacles.map((rect) => rect.x + rect.width),
    ) +
    ROUTE_GAP * 2;

  const candidates: EdgeRoute[] = [
    {
      type: "orthogonal",
      points: [
        start,
        {
          x: leftX,
          y: start.y,
        },
        {
          x: leftX,
          y: end.y,
        },
        end,
      ],
    },
    {
      type: "orthogonal",
      points: [
        start,
        {
          x: rightX,
          y: start.y,
        },
        {
          x: rightX,
          y: end.y,
        },
        end,
      ],
    },
  ];

  const clearRoute = candidates.find(
    (candidate) => !routeIntersectsNodes(candidate.points, obstacles),
  );

  if (clearRoute) {
    return clearRoute;
  }

  /*
   * Both side corridors are blocked (e.g. a node sits in the same row as the
   * source). Returning null here used to make the edge disappear from the
   * canvas; instead keep the candidate that crosses the fewest nodes.
   */
  return candidates.reduce((best, candidate) =>
    countBlockedObstacles(candidate.points, obstacles) <
    countBlockedObstacles(best.points, obstacles)
      ? candidate
      : best,
  );
}

function createLoopRoute(node: Rect, direction: DiagramDirection): EdgeRoute {
  if (direction === "LR") {
    const centerY = node.y + node.height / 2;

    const topY = node.y - ROUTE_GAP;

    const rightX = node.x + node.width + ROUTE_GAP * 2;

    return {
      type: "loop",
      points: [
        {
          x: node.x + node.width,
          y: centerY,
        },
        {
          x: rightX,
          y: centerY,
        },
        {
          x: rightX,
          y: topY,
        },
        {
          x: node.x + node.width / 2,
          y: topY,
        },
        {
          x: node.x + node.width / 2,
          y: node.y,
        },
      ],
    };
  }

  const centerX = node.x + node.width / 2;

  const leftX = node.x - ROUTE_GAP;

  const bottomY = node.y + node.height + ROUTE_GAP * 2;

  return {
    type: "loop",
    points: [
      {
        x: centerX,
        y: node.y + node.height,
      },
      {
        x: centerX,
        y: bottomY,
      },
      {
        x: leftX,
        y: bottomY,
      },
      {
        x: leftX,
        y: node.y + node.height / 2,
      },
      {
        x: node.x,
        y: node.y + node.height / 2,
      },
    ],
  };
}

function isBackEdge(edge: DiagramEdge, levels: Map<string, number>): boolean {
  const fromLevel = levels.get(edge.from);
  const toLevel = levels.get(edge.to);

  if (fromLevel === undefined || toLevel === undefined) {
    return false;
  }

  return toLevel < fromLevel;
}

function createFallbackRoute(from: Rect, to: Rect, direction: DiagramDirection): EdgeRoute {
  const start = getSourcePoint(from, direction, "forward");

  const end = getTargetPoint(to, direction, "forward");

  if (direction === "LR") {
    const corridorX = Math.max(from.x + from.width, to.x + to.width) + ROUTE_GAP;

    return {
      type: "orthogonal",
      points: [
        start,
        {
          x: corridorX,
          y: start.y,
        },
        {
          x: corridorX,
          y: end.y,
        },
        end,
      ],
    };
  }

  const corridorY = Math.max(from.y + from.height, to.y + to.height) + ROUTE_GAP;

  return {
    type: "orthogonal",
    points: [
      start,
      {
        x: start.x,
        y: corridorY,
      },
      {
        x: end.x,
        y: corridorY,
      },
      end,
    ],
  };
}

export function routeEdge(
  edge: DiagramEdge,
  layout: DiagramLayout,
  levels: Map<string, number>,
  direction: DiagramDirection,
  obstacleIndex?: ObstacleIndex,
): EdgeRoute | null {
  const from = getRect(layout, edge.from);

  const to = getRect(layout, edge.to);

  if (!from || !to) {
    return null;
  }

  if (edge.from === edge.to) {
    return createLoopRoute(from, direction);
  }

  const backEdge = isBackEdge(edge, levels);

  let obstacles: Rect[];

  if (!obstacleIndex) {
    obstacles = Object.entries(layout)
      .filter(([nodeId]) => nodeId !== edge.from && nodeId !== edge.to)
      .map(([, rect]) => expandRect(rect, NODE_GAP));
  } else if (backEdge) {
    obstacles = obstacleIndex.all(edge.from, edge.to);
  } else {
    const left = Math.min(from.x, to.x) - ROUTE_REACH;
    const top = Math.min(from.y, to.y) - ROUTE_REACH;
    const right = Math.max(from.x + from.width, to.x + to.width) + ROUTE_REACH;
    const bottom = Math.max(from.y + from.height, to.y + to.height) + ROUTE_REACH;

    obstacles = obstacleIndex.query(
      { x: left, y: top, width: right - left, height: bottom - top },
      edge.from,
      edge.to,
    );
  }

  if (backEdge) {
    return direction === "LR"
      ? createBackEdgeLRRoute(from, to, obstacles)
      : createBackEdgeTDRoute(from, to, obstacles);
  }

  const directRoute = createDirectRoute(from, to, direction, obstacles);

  if (directRoute) {
    return directRoute;
  }

  const orthogonalRoute =
    direction === "LR" ? createLRRoute(from, to, obstacles) : createTDRoute(from, to, obstacles);

  return orthogonalRoute ?? createFallbackRoute(from, to, direction);
}
