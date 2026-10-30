<script setup lang="ts">
import { computed } from "vue";

import { routeEdge, type ObstacleIndex } from "@/features/diagram/edgeRouter";

import type { DiagramEdge, DiagramLayout } from "@/features/diagram/types";

const props = defineProps<{
  edge: DiagramEdge;
  layout: DiagramLayout;
  levels: Map<string, number>;
  direction: "LR" | "TD";
  obstacleIndex?: ObstacleIndex;
}>();

const route = computed(() => {
  return routeEdge(props.edge, props.layout, props.levels, props.direction, props.obstacleIndex);
});

const pathData = computed(() => {
  if (!route.value) {
    return null;
  }

  return route.value.points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${point.x} ${point.y}`;
    })
    .join(" ");
});

const labelPosition = computed(() => {
  if (!route.value) {
    return null;
  }

  const points = route.value.points;

  const middleIndex = Math.floor((points.length - 1) / 2);

  const start = points[middleIndex];
  const end = points[middleIndex + 1];

  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
});
</script>

<template>
  <g v-if="pathData">
    <path :d="pathData" class="diagram-edge" marker-end="url(#arrow)" />

    <text
      v-if="edge.label && labelPosition"
      :x="labelPosition.x"
      :y="labelPosition.y - 6"
      text-anchor="middle"
      class="edge-label"
    >
      {{ edge.label }}
    </text>
  </g>
</template>

<style scoped>
.diagram-edge {
  stroke: var(--edge-color);
  stroke-width: 2;
  fill: none;
  pointer-events: none;
}

.edge-label {
  fill: var(--text-secondary);
  font-size: 11px;
  font-family: Inter, system-ui, sans-serif;
  pointer-events: none;
  paint-order: stroke;
  stroke: var(--canvas-background);
  stroke-width: 6px;
  stroke-linejoin: round;
}
</style>
