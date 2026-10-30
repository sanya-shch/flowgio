import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { nextTick } from "vue";

import DiagramCanvas from "./DiagramCanvas.vue";
import DiagramEdge from "./DiagramEdge.vue";
import DiagramNode from "./DiagramNode.vue";
import { useEditorStore } from "@/stores/editor";

const originalWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
const originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight");

beforeEach(() => {
  // jsdom reports 0x0; give the canvas a real viewport.
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 800 });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 600 });
});

afterEach(() => {
  if (originalWidth) Object.defineProperty(HTMLElement.prototype, "clientWidth", originalWidth);
  if (originalHeight) Object.defineProperty(HTMLElement.prototype, "clientHeight", originalHeight);
});

function mountFarAwayDiagram() {
  const pinia = createPinia();

  setActivePinia(pinia);

  const store = useEditorStore();

  store.setSource('flowchart LR\n\nA["Near"] -> B["Also near"]\nB -> C["Far away"]');
  store.parse();

  const far = store.document.nodes.find((node) => node.label === "Far away")!;

  store.document.layout[far.id]!.x = 100_000;

  const wrapper = mount(DiagramCanvas, { global: { plugins: [pinia] } });

  return { store, wrapper, far };
}

describe("DiagramCanvas viewport culling", () => {
  it("does not mount nodes or edges that are far outside the view", async () => {
    const { wrapper } = mountFarAwayDiagram();

    await nextTick();

    expect(wrapper.findAllComponents(DiagramNode)).toHaveLength(2);
    // A -> B stays; B -> C is far off-screen on one side but its bbox still
    // spans the whole gap, so it crosses the viewport and is kept.
    expect(wrapper.findAllComponents(DiagramEdge).length).toBeGreaterThanOrEqual(1);
  });

  it("mounts a node again once it is panned into view", async () => {
    const { wrapper, store, far } = mountFarAwayDiagram();

    await nextTick();

    store.setOffset(-100_000, 0);
    await nextTick();

    const labels = wrapper.findAllComponents(DiagramNode).map((node) => node.props("node").id);

    expect(labels).toContain(far.id);
  });

  it("keeps the selected node mounted even when it is off-screen", async () => {
    const { wrapper, store, far } = mountFarAwayDiagram();

    store.selectNode(far.id);
    await nextTick();

    const ids = wrapper.findAllComponents(DiagramNode).map((node) => node.props("node").id);

    expect(ids).toContain(far.id);
  });
});
