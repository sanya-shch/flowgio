import type { DiagramEdge, DiagramLayout } from "./types";

export interface WorldRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/*
 * Snap size (world units). The visible rect is rounded outwards to this grid,
 * so panning by a few pixels does not change which elements are rendered and
 * Vue has nothing to re-diff until the view crosses a step.
 */
export const CULLING_STEP = 128;

/*
 * Extra room around the viewport so elements are already mounted when they
 * scroll into view, and so edges that detour around nodes (routes can sit up
 * to ROUTE_GAP outside the endpoints' bounding box) are not cut off early.
 */
export const CULLING_MARGIN = 256;

/**
 * Visible area in diagram coordinates, or null when the viewport size is not
 * known yet (0x0, e.g. before layout or in jsdom): callers then render
 * everything instead of risking an empty canvas.
 */
export function getVisibleWorldRect(
  offset: { x: number; y: number },
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
): WorldRect | null {
  if (!(viewportWidth > 0) || !(viewportHeight > 0) || !(zoom > 0)) {
    return null;
  }

  const left = -offset.x / zoom - CULLING_MARGIN;
  const top = -offset.y / zoom - CULLING_MARGIN;
  const right = (viewportWidth - offset.x) / zoom + CULLING_MARGIN;
  const bottom = (viewportHeight - offset.y) / zoom + CULLING_MARGIN;

  // "+ 0" normalises -0 to 0 so equal rects compare equal everywhere.
  return {
    left: Math.floor(left / CULLING_STEP) * CULLING_STEP + 0,
    top: Math.floor(top / CULLING_STEP) * CULLING_STEP + 0,
    right: Math.ceil(right / CULLING_STEP) * CULLING_STEP + 0,
    bottom: Math.ceil(bottom / CULLING_STEP) * CULLING_STEP + 0,
  };
}

function intersects(
  rect: { x: number; y: number; width: number; height: number },
  view: WorldRect,
): boolean {
  return (
    rect.x <= view.right &&
    rect.x + rect.width >= view.left &&
    rect.y <= view.bottom &&
    rect.y + rect.height >= view.top
  );
}

/** Ids of nodes that touch the view; `alwaysInclude` (selected / dragged) are kept regardless. */
export function selectVisibleNodeIds(
  nodeIds: readonly string[],
  layout: DiagramLayout,
  view: WorldRect | null,
  alwaysInclude: ReadonlyArray<string | null> = [],
): Set<string> {
  const visible = new Set<string>();

  for (const id of nodeIds) {
    const rect = layout[id];

    if (rect && (!view || intersects(rect, view))) {
      visible.add(id);
    }
  }

  for (const id of alwaysInclude) {
    if (id && layout[id]) {
      visible.add(id);
    }
  }

  return visible;
}

/**
 * An edge is visible when the bounding box of its two endpoints touches the
 * view. That also keeps long edges whose endpoints are both off-screen but
 * which cross the viewport.
 */
export function selectVisibleEdges(
  edges: readonly DiagramEdge[],
  layout: DiagramLayout,
  view: WorldRect | null,
): DiagramEdge[] {
  if (!view) {
    return edges as DiagramEdge[];
  }

  return edges.filter((edge) => {
    const from = layout[edge.from];
    const to = layout[edge.to];

    if (!from || !to) {
      return false;
    }

    const left = Math.min(from.x, to.x);
    const top = Math.min(from.y, to.y);
    const right = Math.max(from.x + from.width, to.x + to.width);
    const bottom = Math.max(from.y + from.height, to.y + to.height);

    return intersects({ x: left, y: top, width: right - left, height: bottom - top }, view);
  });
}
