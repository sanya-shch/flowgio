import { routeEdge, type EdgePoint } from "./edgeRouter";

import type { DiagramDocument, DiagramNode } from "./types";

import { calculateLevels } from "./layout";
import { wrapNodeLabel } from "./nodeSizing";
import type { Theme } from "@/stores/theme";

const EXPORT_PADDING = 40;
const NODE_LABEL_FONT_SIZE = 14;
const NODE_LABEL_LINE_HEIGHT = 20;
const EDGE_LABEL_FONT_SIZE = 11;

interface ExportColors {
  background: string;
  nodeFill: string;
  nodeBorder: string;
  nodeText: string;
  edge: string;
  edgeLabelBackground: string;
}

const EXPORT_THEMES: Record<Theme, ExportColors> = {
  dark: {
    background: "#0d1117",
    nodeFill: "#161b22",
    nodeBorder: "#58606b",
    nodeText: "#e6edf3",
    edge: "#8b949e",
    edgeLabelBackground: "#0d1117",
  },

  light: {
    background: "#ffffff",
    nodeFill: "#ffffff",
    nodeBorder: "#8b949e",
    nodeText: "#1f2328",
    edge: "#57606a",
    edgeLabelBackground: "#ffffff",
  },

  midnight: {
    background: "#0b1020",
    nodeFill: "#11182d",
    nodeBorder: "#46557a",
    nodeText: "#e6eaff",
    edge: "#8290b5",
    edgeLabelBackground: "#0b1020",
  },
};

interface ExportEdge {
  edge: DiagramDocument["edges"][number];
  route: NonNullable<ReturnType<typeof routeEdge>>;
}

function getExportEdges(document: DiagramDocument, levels: Map<string, number>): ExportEdge[] {
  const result: ExportEdge[] = [];

  for (const edge of document.edges) {
    const route = routeEdge(edge, document.layout, levels, document.direction);

    if (!route) {
      continue;
    }

    result.push({
      edge,
      route,
    });
  }

  return result;
}

interface ExportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function createEmptyBounds(): ExportBounds {
  return {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
}

function includePoint(bounds: ExportBounds, x: number, y: number, padding = 0): void {
  bounds.minX = Math.min(bounds.minX, x - padding);
  bounds.minY = Math.min(bounds.minY, y - padding);

  bounds.maxX = Math.max(bounds.maxX, x + padding);
  bounds.maxY = Math.max(bounds.maxY, y + padding);
}

function includeRect(
  bounds: ExportBounds,
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  padding = 0,
): void {
  includePoint(bounds, rect.x, rect.y, padding);

  includePoint(bounds, rect.x + rect.width, rect.y + rect.height, padding);
}

function isValidBounds(bounds: ExportBounds): boolean {
  return (
    Number.isFinite(bounds.minX) &&
    Number.isFinite(bounds.minY) &&
    Number.isFinite(bounds.maxX) &&
    Number.isFinite(bounds.maxY)
  );
}

interface ExportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getBounds(document: DiagramDocument, exportEdges: ExportEdge[]): ExportBounds {
  const bounds = createEmptyBounds();

  for (const node of document.nodes) {
    const layout = document.layout[node.id];

    if (!layout) {
      continue;
    }

    includeRect(bounds, layout, 4);
  }

  for (const { edge, route } of exportEdges) {
    for (const point of route.points) {
      includePoint(bounds, point.x, point.y, 8);
    }

    if (edge.label) {
      const position = getEdgeLabelPosition(route.points);

      if (position) {
        includePoint(bounds, position.x, position.y - 6, 24);
      }
    }
  }

  if (!isValidBounds(bounds)) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
    };
  }

  return bounds;
}

function getLabelLines(label: string, width: number): string[] {
  return wrapNodeLabel(label, width);
}

function renderMultilineText(label: string, x: number, y: number, width: number): string {
  const lines = getLabelLines(label, width);

  const startY = y - ((lines.length - 1) * NODE_LABEL_LINE_HEIGHT) / 2;

  return lines
    .map(
      (line, index) => `
        <tspan
          x="${x}"
          y="${startY + index * NODE_LABEL_LINE_HEIGHT}"
        >${escapeXml(line)}</tspan>
      `,
    )
    .join("");
}

function renderNode(node: DiagramNode, document: DiagramDocument, colors: ExportColors): string {
  const layout = document.layout[node.id];

  if (!layout) {
    return "";
  }

  const centerX = layout.x + layout.width / 2;
  const centerY = layout.y + layout.height / 2;

  let shape;

  switch (node.shape) {
    case "rounded":
      shape = `
        <rect
          x="${layout.x}"
          y="${layout.y}"
          width="${layout.width}"
          height="${layout.height}"
          rx="12"
          fill="${colors.nodeFill}"
          stroke="${colors.nodeBorder}"
          stroke-width="2"
        />
      `;
      break;

    case "circle":
      shape = `
        <ellipse
          cx="${centerX}"
          cy="${centerY}"
          rx="${layout.width / 2}"
          ry="${layout.height / 2}"
          fill="${colors.nodeFill}"
          stroke="${colors.nodeBorder}"
          stroke-width="2"
        />
      `;
      break;

    case "diamond":
      shape = `
        <polygon
          points="
            ${centerX},${layout.y}
            ${layout.x + layout.width},${centerY}
            ${centerX},${layout.y + layout.height}
            ${layout.x},${centerY}
          "
          fill="${colors.nodeFill}"
          stroke="${colors.nodeBorder}"
          stroke-width="2"
        />
      `;
      break;

    case "rectangle":
    default:
      shape = `
        <rect
          x="${layout.x}"
          y="${layout.y}"
          width="${layout.width}"
          height="${layout.height}"
          fill="${colors.nodeFill}"
          stroke="${colors.nodeBorder}"
          stroke-width="2"
        />
      `;
      break;
  }

  const label = `
    <text
      x="${centerX}"
      y="${centerY}"
      text-anchor="middle"
      dominant-baseline="middle"
      fill="${colors.nodeText}"
      font-family="Inter, system-ui, sans-serif"
      font-size="${NODE_LABEL_FONT_SIZE}"
    >
      ${renderMultilineText(node.label, centerX, centerY, layout.width)}
    </text>
  `;

  return `
    <g data-node-id="${escapeXml(node.id)}">
      ${shape}
      ${label}
    </g>
  `;
}

function pointsToPath(points: EdgePoint[]): string {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${point.x} ${point.y}`;
    })
    .join(" ");
}

function getEdgeLabelPosition(points: EdgePoint[]): EdgePoint | null {
  if (points.length < 2) {
    return null;
  }

  const middleIndex = Math.floor((points.length - 1) / 2);

  const start = points[middleIndex];
  const end = points[middleIndex + 1];

  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };
}

function renderEdge(
  edge: DiagramDocument["edges"][number],
  route: NonNullable<ReturnType<typeof routeEdge>>,
  colors: ExportColors,
): string {
  let label = "";

  if (edge.label) {
    const position = getEdgeLabelPosition(route.points);

    if (position) {
      label = `
        <text
          x="${position.x}"
          y="${position.y - 6}"
          text-anchor="middle"
          fill="${colors.nodeText}"
          font-family="Inter, system-ui, sans-serif"
          font-size="${EDGE_LABEL_FONT_SIZE}"
          paint-order="stroke"
          stroke="${colors.edgeLabelBackground}"
          stroke-width="6"
          stroke-linejoin="round"
        >
          ${escapeXml(edge.label)}
        </text>
      `;
    }
  }

  return `
    <g data-edge-id="${escapeXml(edge.id)}">
      <path
        d="${pointsToPath(route.points)}"
        fill="none"
        stroke="${colors.edge}"
        stroke-width="2"
        marker-end="url(#flowgio-arrow)"
      />
      ${label}
    </g>
  `;
}

export function exportDiagramToSvg(document: DiagramDocument, theme: Theme = "dark"): string {
  const colors = EXPORT_THEMES[theme];

  const levels = calculateLevels(document.nodes, document.edges);

  const exportEdges = getExportEdges(document, levels);

  const bounds = getBounds(document, exportEdges);

  const x = bounds.minX - EXPORT_PADDING;

  const y = bounds.minY - EXPORT_PADDING;

  const width = bounds.maxX - bounds.minX + EXPORT_PADDING * 2;

  const height = bounds.maxY - bounds.minY + EXPORT_PADDING * 2;

  const edges = exportEdges.map(({ edge, route }) => renderEdge(edge, route, colors)).join("");

  const nodes = document.nodes.map((node) => renderNode(node, document, colors)).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="${x} ${y} ${width} ${height}"
>
  <defs>
    <marker
      id="flowgio-arrow"
      markerWidth="10"
      markerHeight="10"
      refX="8"
      refY="3"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <path
        d="M0,0 L0,6 L9,3 z"
        fill="${colors.edge}"
      />
    </marker>
  </defs>

  <rect
    x="${x}"
    y="${y}"
    width="${width}"
    height="${height}"
    fill="${colors.background}"
  />

  ${edges}
  ${nodes}
</svg>`;
}
