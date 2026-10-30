import { describe, expect, it } from "vitest";

import {
  CULLING_MARGIN,
  CULLING_STEP,
  getVisibleWorldRect,
  selectVisibleEdges,
  selectVisibleNodeIds,
} from "./viewportCulling";

const layout = {
  a: { x: 0, y: 0, width: 100, height: 50 },
  b: { x: 400, y: 0, width: 100, height: 50 },
  far: { x: 50_000, y: 50_000, width: 100, height: 50 },
  farRight: { x: 60_000, y: 0, width: 100, height: 50 },
};

describe("getVisibleWorldRect", () => {
  it("returns null while the viewport size is unknown", () => {
    expect(getVisibleWorldRect({ x: 0, y: 0 }, 1, 0, 0)).toBeNull();
    expect(getVisibleWorldRect({ x: 0, y: 0 }, 0, 800, 600)).toBeNull();
  });

  it("covers the viewport plus margin, snapped outwards", () => {
    const view = getVisibleWorldRect({ x: 0, y: 0 }, 1, 800, 600)!;

    expect(view.left).toBeLessThanOrEqual(-CULLING_MARGIN);
    expect(view.right).toBeGreaterThanOrEqual(800 + CULLING_MARGIN);
    expect(view.top).toBeLessThanOrEqual(-CULLING_MARGIN);
    expect(view.bottom).toBeGreaterThanOrEqual(600 + CULLING_MARGIN);
    expect(Math.abs(view.left % CULLING_STEP)).toBe(0);
  });

  it("accounts for pan and zoom", () => {
    // Panned 1000px left at 2x zoom: world x 500..900 is on screen.
    const view = getVisibleWorldRect({ x: -1000, y: 0 }, 2, 800, 600)!;

    expect(view.left).toBeLessThanOrEqual(500 - CULLING_MARGIN);
    expect(view.right).toBeGreaterThanOrEqual(900 + CULLING_MARGIN);
  });

  it("is stable for tiny pans (no re-render churn)", () => {
    const first = getVisibleWorldRect({ x: -10, y: -10 }, 1, 800, 600);
    const second = getVisibleWorldRect({ x: -13, y: -12 }, 1, 800, 600);

    expect(second).toEqual(first);
  });
});

describe("selectVisibleNodeIds", () => {
  const view = getVisibleWorldRect({ x: 0, y: 0 }, 1, 800, 600);

  it("keeps only nodes near the view", () => {
    const ids = selectVisibleNodeIds(Object.keys(layout), layout, view);

    expect([...ids].sort()).toEqual(["a", "b"]);
  });

  it("renders everything when the view is unknown", () => {
    expect(selectVisibleNodeIds(Object.keys(layout), layout, null).size).toBe(4);
  });

  it("always keeps selected / dragged nodes", () => {
    const ids = selectVisibleNodeIds(Object.keys(layout), layout, view, ["far", null, "ghost"]);

    expect(ids.has("far")).toBe(true);
    expect(ids.has("ghost")).toBe(false);
  });
});

describe("selectVisibleEdges", () => {
  const view = getVisibleWorldRect({ x: 0, y: 0 }, 1, 800, 600);

  const edges = [
    { id: "visible", from: "a", to: "b" },
    { id: "offscreen", from: "far", to: "farRight" },
    // Both endpoints off-screen but the edge crosses the viewport.
    { id: "crossing", from: "farRight", to: "a" },
    { id: "dangling", from: "a", to: "missing" },
  ];

  it("keeps edges whose bounding box touches the view", () => {
    expect(selectVisibleEdges(edges, layout, view).map((edge) => edge.id)).toEqual([
      "visible",
      "crossing",
    ]);
  });

  it("returns all edges when the view is unknown", () => {
    expect(selectVisibleEdges(edges, layout, null)).toHaveLength(4);
  });
});
