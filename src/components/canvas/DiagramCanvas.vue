<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";

import { useEditorStore } from "@/stores/editor";
import { createRouteObstacleIndex } from "@/features/diagram/edgeRouter";
import { calculateLevels } from "@/features/diagram/layout";
import {
  getVisibleWorldRect,
  selectVisibleEdges,
  selectVisibleNodeIds,
} from "@/features/diagram/viewportCulling";
import DiagramNode from "./DiagramNode.vue";
import DiagramEdge from "./DiagramEdge.vue";

const props = withDefaults(
  defineProps<{
    readonly?: boolean;
  }>(),
  {
    readonly: false,
  },
);

const store = useEditorStore();

const canvasRef = ref<SVGSVGElement | null>(null);

const viewportRef = ref<HTMLElement | null>(null);

function releasePointerCapture(event: PointerEvent) {
  const element = canvasRef.value;

  if (!element) return;

  if (
    typeof element.hasPointerCapture !== "function" ||
    typeof element.releasePointerCapture !== "function"
  ) {
    return;
  }

  if (!element.hasPointerCapture(event.pointerId)) {
    return;
  }

  try {
    element.releasePointerCapture(event.pointerId);
  } catch {
    // ignore error
  }
}

const levels = computed(() => {
  return calculateLevels(store.document.nodes, store.document.edges);
});

/*
 * Shared spatial index: each edge asks it for nearby nodes instead of scanning
 * all of them. Rebuilding is O(nodes) per layout change (e.g. per drag frame).
 */
const obstacleIndex = computed(() => createRouteObstacleIndex(store.document.layout));

// -----------------------------------------------------------------------------
// Viewport culling
// -----------------------------------------------------------------------------

/*
 * Only nodes / edges near the visible area are mounted, so DOM size (and the
 * per-frame work of dragging) depends on what is on screen, not on diagram
 * size. Until the viewport has been measured everything is rendered.
 */
const viewportSize = ref({ width: 0, height: 0 });

let resizeObserver: ResizeObserver | null = null;

function measureViewport() {
  const element = viewportRef.value;

  if (!element) {
    return;
  }

  viewportSize.value = { width: element.clientWidth, height: element.clientHeight };
}

onMounted(() => {
  measureViewport();

  if (typeof ResizeObserver !== "undefined" && viewportRef.value) {
    resizeObserver = new ResizeObserver(measureViewport);
    resizeObserver.observe(viewportRef.value);
  }
});

// Split into primitives so the lists below only recompute when the (snapped)
// visible area actually changes, not on every pan pixel.
const visibleWorldRect = computed(() =>
  getVisibleWorldRect(
    store.offset,
    store.zoom,
    viewportSize.value.width,
    viewportSize.value.height,
  ),
);

const viewLeft = computed(() => visibleWorldRect.value?.left);
const viewTop = computed(() => visibleWorldRect.value?.top);
const viewRight = computed(() => visibleWorldRect.value?.right);
const viewBottom = computed(() => visibleWorldRect.value?.bottom);

const stableView = computed(() =>
  viewLeft.value === undefined
    ? null
    : {
        left: viewLeft.value,
        top: viewTop.value!,
        right: viewRight.value!,
        bottom: viewBottom.value!,
      },
);

const visibleNodeIds = computed(() =>
  selectVisibleNodeIds(
    store.document.nodes.map((node) => node.id),
    store.document.layout,
    stableView.value,
    [store.selectedNodeId, draggingNodeId.value],
  ),
);

const visibleNodes = computed(() =>
  stableView.value
    ? store.document.nodes.filter((node) => visibleNodeIds.value.has(node.id))
    : store.document.nodes,
);

const visibleEdges = computed(() =>
  selectVisibleEdges(store.document.edges, store.document.layout, stableView.value),
);

// -----------------------------------------------------------------------------
// Node dragging
// -----------------------------------------------------------------------------

const isDraggingNode = ref(false);

const draggingNodeId = ref<string | null>(null);

const dragStart = ref({
  x: 0,
  y: 0,
});

const nodeStart = ref({
  x: 0,
  y: 0,
});

/**
 * Pointer movement below this threshold
 * is treated as a click rather than a drag.
 */
const DRAG_THRESHOLD = 4;

const didDragNode = ref(false);

/**
 * Pointer capture causes the click event to
 * potentially arrive at the SVG instead of
 * the original node.
 *
 * We suppress only the click generated after
 * an actual drag, never after a simple click.
 */
const suppressNextCanvasClick = ref(false);

let activePointerId: number | null = null;

// -----------------------------------------------------------------------------
// Canvas panning
// -----------------------------------------------------------------------------

const isPanning = ref(false);

const panStart = ref({
  x: 0,
  y: 0,
});

const panStartOffset = ref({
  x: 0,
  y: 0,
});

// -----------------------------------------------------------------------------
// Computed
// -----------------------------------------------------------------------------

const transform = computed(() => {
  return `
    translate(${store.offset.x} ${store.offset.y})
    scale(${store.zoom})
  `;
});

// -----------------------------------------------------------------------------
// Node dragging
// -----------------------------------------------------------------------------

function startNodeDrag(event: PointerEvent, nodeId: string) {
  if (props.readonly) {
    return;
  }

  if (event.button !== 0) {
    return;
  }

  const layout = store.document.layout[nodeId];

  if (!layout) {
    return;
  }

  event.stopPropagation();

  store.selectNode(nodeId);

  draggingNodeId.value = nodeId;
  didDragNode.value = false;
  activePointerId = event.pointerId;

  dragStart.value = {
    x: event.clientX,
    y: event.clientY,
  };

  nodeStart.value = {
    x: layout.x,
    y: layout.y,
  };
}

function moveNode(event: PointerEvent) {
  if (!draggingNodeId.value) {
    return;
  }

  if (activePointerId !== null && event.pointerId !== activePointerId) {
    return;
  }

  const rawDx = event.clientX - dragStart.value.x;

  const rawDy = event.clientY - dragStart.value.y;

  if (!didDragNode.value) {
    const distance = Math.hypot(rawDx, rawDy);

    if (distance < DRAG_THRESHOLD) {
      return;
    }

    didDragNode.value = true;
    isDraggingNode.value = true;

    store.beginHistoryTransaction();

    try {
      canvasRef.value?.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture may not be available.
    }
  }

  const dx = rawDx / store.zoom;

  const dy = rawDy / store.zoom;

  store.updateNodePosition(draggingNodeId.value, nodeStart.value.x + dx, nodeStart.value.y + dy);
}

function stopNodeDrag(event?: PointerEvent) {
  if (event && activePointerId !== null && event.pointerId !== activePointerId) {
    return;
  }

  if (event) {
    releasePointerCapture(event);
  }

  if (didDragNode.value) {
    store.endHistoryTransaction();
    suppressNextCanvasClick.value = true;
  }

  isDraggingNode.value = false;
  draggingNodeId.value = null;
  didDragNode.value = false;
  activePointerId = null;
}

// -----------------------------------------------------------------------------
// Canvas click
// -----------------------------------------------------------------------------

function handleCanvasClick(event: MouseEvent) {
  /**
   * Pointer capture can make the click event
   * target the SVG after a drag.
   *
   * Consume that click without deselecting
   * the node.
   */
  if (suppressNextCanvasClick.value) {
    suppressNextCanvasClick.value = false;
    return;
  }

  /**
   * Clicking the empty canvas deselects the node.
   */
  if (event.target === event.currentTarget) {
    store.selectNode(null);
  }
}

// -----------------------------------------------------------------------------
// Canvas panning
// -----------------------------------------------------------------------------

function startPan(event: PointerEvent) {
  if (event.button !== 0) {
    return;
  }

  if (draggingNodeId.value) {
    return;
  }

  if (event.target !== event.currentTarget) {
    return;
  }

  event.preventDefault();

  isPanning.value = true;

  panStart.value = {
    x: event.clientX,
    y: event.clientY,
  };

  panStartOffset.value = {
    x: store.offset.x,
    y: store.offset.y,
  };

  activePointerId = event.pointerId;

  try {
    canvasRef.value?.setPointerCapture(event.pointerId);
  } catch {
    // Pointer capture is not critical.
  }
}

function movePan(event: PointerEvent) {
  if (!isPanning.value) {
    return;
  }

  const dx = event.clientX - panStart.value.x;

  const dy = event.clientY - panStart.value.y;

  store.setOffset(panStartOffset.value.x + dx, panStartOffset.value.y + dy);
}

function stopPan(event?: PointerEvent) {
  if (event && activePointerId !== null && event.pointerId !== activePointerId) {
    return;
  }

  if (event) {
    releasePointerCapture(event);
  }

  isPanning.value = false;
  activePointerId = null;
}

// -----------------------------------------------------------------------------
// Pointer events
// -----------------------------------------------------------------------------

function handlePointerMove(event: PointerEvent) {
  if (draggingNodeId.value) {
    moveNode(event);
    return;
  }

  if (isPanning.value) {
    movePan(event);
  }
}

function handlePointerUp(event: PointerEvent) {
  if (draggingNodeId.value) {
    stopNodeDrag(event);
    return;
  }

  if (isPanning.value) {
    stopPan(event);
  }
}

function handlePointerCancel(event: PointerEvent) {
  if (draggingNodeId.value) {
    stopNodeDrag(event);
    return;
  }

  if (isPanning.value) {
    stopPan(event);
  }
}

function handleNodeSelect(nodeId: string) {
  if (props.readonly) {
    return;
  }

  store.selectNode(nodeId);
}

// -----------------------------------------------------------------------------
// Zoom
// -----------------------------------------------------------------------------

function zoomAtPoint(newZoom: number, clientX: number, clientY: number) {
  const svg = canvasRef.value;

  if (!svg) {
    store.setZoom(newZoom);
    return;
  }

  const rect = svg.getBoundingClientRect();

  const mouseX = clientX - rect.left;

  const mouseY = clientY - rect.top;

  const oldZoom = store.zoom;

  const worldX = (mouseX - store.offset.x) / oldZoom;

  const worldY = (mouseY - store.offset.y) / oldZoom;

  store.setZoom(newZoom);

  const actualZoom = store.zoom;

  store.setOffset(mouseX - worldX * actualZoom, mouseY - worldY * actualZoom);
}

function handleWheel(event: WheelEvent) {
  event.preventDefault();

  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;

  const newZoom = store.zoom * zoomFactor;

  zoomAtPoint(newZoom, event.clientX, event.clientY);
}

async function fitToScreen() {
  await nextTick();

  const viewport = viewportRef.value;

  if (!viewport) {
    return;
  }

  store.fitToScreen(viewport.clientWidth, viewport.clientHeight);
}

// -----------------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------------

/*
 * Global keyboard shortcuts (Escape to deselect, Cmd/Ctrl+0 to reset
 * the viewport, undo/redo, etc.) are handled once, centrally, by
 * `useEditorShortcuts` in the parent EditorPage — this component
 * only ever renders inside that page, so it doesn't need its own
 * "window" keydown listener.
 */

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  stopNodeDrag();
  stopPan();
});
</script>

<template>
  <div ref="viewportRef" class="diagram-canvas">
    <div class="zoom-controls" @pointerdown.stop @pointermove.stop @pointerup.stop @wheel.stop>
      <button type="button" aria-label="Zoom out" title="Zoom out" @click="store.zoomOut()">
        −
      </button>

      <span class="zoom-value"> {{ Math.round(store.zoom * 100) }}% </span>

      <button type="button" aria-label="Zoom in" title="Zoom in" @click="store.zoomIn()">+</button>

      <button type="button" title="Fit diagram" @click="fitToScreen">Fit</button>
    </div>

    <svg
      ref="canvasRef"
      class="diagram-svg"
      @pointerdown="startPan"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerUp"
      @pointercancel="handlePointerCancel"
      @wheel="handleWheel"
      @click="handleCanvasClick"
    >
      <defs>
        <marker
          id="arrow"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" class="arrow-head" />
        </marker>

        <pattern
          id="grid"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
          :patternTransform="`translate(${store.offset.x % 24} ${store.offset.y % 24})`"
        >
          <circle cx="1" cy="1" r="1" class="grid-dot" />
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#grid)" pointer-events="none" />

      <g :transform="transform">
        <DiagramEdge
          v-for="edge in visibleEdges"
          :key="edge.id"
          :edge="edge"
          :layout="store.document.layout"
          :levels="levels"
          :direction="store.document.direction"
          :obstacle-index="obstacleIndex"
        />

        <DiagramNode
          v-for="node in visibleNodes"
          :key="node.id"
          :node="node"
          :layout="store.document.layout[node.id]"
          :selected="store.selectedNodeId === node.id"
          :readonly="readonly"
          @select="handleNodeSelect"
          @drag-start="startNodeDrag"
        />
      </g>
    </svg>

    <div v-if="!store.document.nodes.length" class="empty-state">
      <p>No nodes yet</p>

      <span> Create a diagram in the editor </span>
    </div>

    <div v-if="store.hasErrors" class="error-panel" role="alert" aria-live="polite">
      <div v-for="error in store.errors" :key="`${error.line}-${error.message}`" class="error">
        <strong> Line {{ error.line }} </strong>

        <span>
          {{ error.message }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diagram-canvas {
  position: relative;

  width: 100%;
  height: 100%;

  min-width: 0;
  min-height: 0;

  overflow: hidden;

  background: var(--canvas-background);

  touch-action: none;
  user-select: none;
}

.diagram-svg {
  display: block;

  width: 100%;
  height: 100%;

  cursor: grab;
}

.diagram-svg:active {
  cursor: grabbing;
}

.arrow-head {
  fill: var(--edge-color);
}

.grid-dot {
  fill: var(--grid-color);
}

.zoom-controls {
  position: absolute;

  top: 16px;
  right: 16px;

  z-index: 10;

  display: flex;
  align-items: center;

  gap: 4px;

  padding: 4px;

  border: 1px solid var(--border-color);
  border-radius: 8px;

  background: var(--panel-background);
  box-shadow: var(--panel-shadow);
}

.zoom-controls button {
  display: flex;
  align-items: center;
  justify-content: center;

  min-width: 32px;
  height: 32px;

  padding: 0 8px;

  border: 0;
  border-radius: 6px;

  background: transparent;
  color: var(--text-primary);

  cursor: pointer;

  font: inherit;
}

.zoom-controls button:hover {
  background: var(--hover-background);
}

.zoom-value {
  min-width: 52px;

  text-align: center;

  color: var(--text-secondary);

  font-size: 12px;
}

.empty-state {
  position: absolute;
  inset: 0;

  display: flex;
  flex-direction: column;

  align-items: center;
  justify-content: center;

  pointer-events: none;

  color: var(--text-secondary);
}

.empty-state p {
  margin: 0 0 4px;

  color: var(--text-primary);

  font-size: 16px;
  font-weight: 600;
}

.empty-state span {
  font-size: 13px;
}

.error-panel {
  position: absolute;

  left: 16px;
  right: 16px;
  bottom: 16px;

  z-index: 10;

  display: flex;
  flex-direction: column;

  gap: 8px;

  max-height: 180px;

  overflow: auto;

  padding: 12px;

  border: 1px solid var(--error-border);
  border-radius: 8px;

  background: var(--error-background);
}

.error {
  display: flex;

  gap: 8px;

  font-size: 12px;
}

.error strong {
  flex-shrink: 0;

  color: var(--error-color);
}

.error span {
  color: var(--text-secondary);
}
</style>
