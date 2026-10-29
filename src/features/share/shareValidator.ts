import { DIAGRAM_LIMITS } from "@/features/diagram/limits";
import type {
  DiagramDirection,
  DiagramDocument,
  DiagramEdge,
  DiagramLayout,
  DiagramNode,
  DiagramSourceMap,
  NodeShape,
} from "@/features/diagram/types";

const NODE_SHAPES: NodeShape[] = ["rectangle", "rounded", "circle", "diamond"];

const DIRECTIONS: DiagramDirection[] = ["TD", "LR"];

/*
 * Ids end up as keys of plain objects (layout) and in DOM ids, so they are
 * restricted to a conservative alphabet. Names that live on Object.prototype
 * are rejected as well.
 */
const SAFE_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const FORBIDDEN_IDS = new Set([
  "__proto__",
  "prototype",
  "constructor",
  "toString",
  "valueOf",
  "hasOwnProperty",
]);

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= DIAGRAM_LIMITS.maxIdLength &&
    SAFE_ID_PATTERN.test(value) &&
    !FORBIDDEN_IDS.has(value)
  );
}

function isLabel(value: unknown): value is string {
  return typeof value === "string" && value.length <= DIAGRAM_LIMITS.maxLabelLength;
}

function isNodeShape(value: unknown): value is NodeShape {
  return typeof value === "string" && NODE_SHAPES.includes(value as NodeShape);
}

function isBoundedNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function validateNodes(value: unknown): ValidationResult<DiagramNode[]> {
  if (!Array.isArray(value)) {
    return fail("nodes must be an array");
  }

  if (value.length > DIAGRAM_LIMITS.maxNodes) {
    return fail(`too many nodes (max ${DIAGRAM_LIMITS.maxNodes})`);
  }

  const seen = new Set<string>();

  for (const node of value as unknown[]) {
    if (!isRecord(node) || !isSafeId(node.id)) {
      return fail("node has an invalid id");
    }

    if (seen.has(node.id)) {
      return fail(`duplicate node id "${node.id}"`);
    }

    seen.add(node.id);

    if (!isLabel(node.label)) {
      return fail(`node "${node.id}" has an invalid label`);
    }

    if (!isNodeShape(node.shape)) {
      return fail(`node "${node.id}" has an invalid shape`);
    }
  }

  return { ok: true, value: value as DiagramNode[] };
}

function validateEdges(value: unknown, nodeIds: Set<string>): ValidationResult<DiagramEdge[]> {
  if (!Array.isArray(value)) {
    return fail("edges must be an array");
  }

  if (value.length > DIAGRAM_LIMITS.maxEdges) {
    return fail(`too many edges (max ${DIAGRAM_LIMITS.maxEdges})`);
  }

  const seen = new Set<string>();

  for (const edge of value as unknown[]) {
    if (!isRecord(edge) || !isSafeId(edge.id)) {
      return fail("edge has an invalid id");
    }

    if (seen.has(edge.id)) {
      return fail(`duplicate edge id "${edge.id}"`);
    }

    seen.add(edge.id);

    if (typeof edge.from !== "string" || !nodeIds.has(edge.from)) {
      return fail(`edge "${edge.id}" references an unknown source node`);
    }

    if (typeof edge.to !== "string" || !nodeIds.has(edge.to)) {
      return fail(`edge "${edge.id}" references an unknown target node`);
    }

    if (edge.label !== undefined && !isLabel(edge.label)) {
      return fail(`edge "${edge.id}" has an invalid label`);
    }

    if (edge.routing !== undefined && edge.routing !== "direct" && edge.routing !== "around") {
      return fail(`edge "${edge.id}" has an invalid routing`);
    }
  }

  return { ok: true, value: value as DiagramEdge[] };
}

function validateLayout(value: unknown, nodeIds: Set<string>): ValidationResult<DiagramLayout> {
  if (!isRecord(value)) {
    return fail("layout must be an object");
  }

  const keys = Object.keys(value);

  if (keys.length !== nodeIds.size) {
    return fail("layout must contain exactly one entry per node");
  }

  for (const key of keys) {
    if (!nodeIds.has(key)) {
      return fail(`layout entry "${key}" does not match any node`);
    }

    const entry = value[key];

    if (
      !isRecord(entry) ||
      !isBoundedNumber(entry.x, -DIAGRAM_LIMITS.maxCoordinate, DIAGRAM_LIMITS.maxCoordinate) ||
      !isBoundedNumber(entry.y, -DIAGRAM_LIMITS.maxCoordinate, DIAGRAM_LIMITS.maxCoordinate) ||
      !isBoundedNumber(entry.width, 1, DIAGRAM_LIMITS.maxNodeSize) ||
      !isBoundedNumber(entry.height, 1, DIAGRAM_LIMITS.maxNodeSize)
    ) {
      return fail(`layout entry "${key}" is invalid`);
    }
  }

  return { ok: true, value: value as unknown as DiagramLayout };
}

function validateSourceMap(
  value: unknown,
  nodeIds: Set<string>,
): ValidationResult<DiagramSourceMap> {
  if (!isRecord(value)) {
    return fail("sourceMap must be an object");
  }

  const keys = Object.keys(value);

  if (keys.length > nodeIds.size) {
    return fail("sourceMap has more entries than nodes");
  }

  for (const key of keys) {
    const target = value[key];

    if (key.length > DIAGRAM_LIMITS.maxIdLength) {
      return fail("sourceMap contains an overly long key");
    }

    if (typeof target !== "string" || !nodeIds.has(target)) {
      return fail(`sourceMap entry "${key}" does not point to a node`);
    }
  }

  return { ok: true, value: value as DiagramSourceMap };
}

/*
 * Validates untrusted input (share link, imported file) and explains the first
 * problem found. Checks structure, limits, id uniqueness and referential
 * integrity, so the renderer can rely on every node having a layout entry.
 */
export function validateDiagramDocument(value: unknown): ValidationResult<DiagramDocument> {
  if (!isRecord(value)) {
    return fail("document must be an object");
  }

  if (!DIRECTIONS.includes(value.direction as DiagramDirection)) {
    return fail("invalid direction");
  }

  const nodes = validateNodes(value.nodes);

  if (!nodes.ok) {
    return nodes;
  }

  const nodeIds = new Set(nodes.value.map((node) => node.id));

  const edges = validateEdges(value.edges, nodeIds);

  if (!edges.ok) {
    return edges;
  }

  const layout = validateLayout(value.layout, nodeIds);

  if (!layout.ok) {
    return layout;
  }

  const sourceMap = validateSourceMap(value.sourceMap, nodeIds);

  if (!sourceMap.ok) {
    return sourceMap;
  }

  return { ok: true, value: value as unknown as DiagramDocument };
}

export function isDiagramDocument(value: unknown): value is DiagramDocument {
  return validateDiagramDocument(value).ok;
}
