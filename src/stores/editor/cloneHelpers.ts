import type { DiagramDocument, DiagramLayout, DiagramSourceMap } from "@/features/diagram/types";

export function cloneDocument(value: DiagramDocument): DiagramDocument {
  return JSON.parse(JSON.stringify(value)) as DiagramDocument;
}

function recordsEqual<T>(
  first: Record<string, T>,
  second: Record<string, T>,
  isEqual: (a: T, b: T) => boolean,
): boolean {
  const firstKeys = Object.keys(first);

  if (firstKeys.length !== Object.keys(second).length) {
    return false;
  }

  for (const key of firstKeys) {
    if (!Object.hasOwn(second, key) || !isEqual(first[key]!, second[key]!)) {
      return false;
    }
  }

  return true;
}

/*
 * Field-by-field comparison with early exit. It runs on every committed edit
 * and every drag, so it avoids serialising both documents to JSON (two large
 * string allocations per call). Keep it in sync with the types in
 * features/diagram/types.ts; cloneHelpers.test.ts fails if a field is missed.
 */
export function documentsEqual(first: DiagramDocument, second: DiagramDocument): boolean {
  if (
    first.direction !== second.direction ||
    first.nodes.length !== second.nodes.length ||
    first.edges.length !== second.edges.length
  ) {
    return false;
  }

  for (let index = 0; index < first.nodes.length; index += 1) {
    const a = first.nodes[index]!;
    const b = second.nodes[index]!;

    if (a.id !== b.id || a.label !== b.label || a.shape !== b.shape) {
      return false;
    }
  }

  for (let index = 0; index < first.edges.length; index += 1) {
    const a = first.edges[index]!;
    const b = second.edges[index]!;

    if (
      a.id !== b.id ||
      a.from !== b.from ||
      a.to !== b.to ||
      a.label !== b.label ||
      a.routing !== b.routing
    ) {
      return false;
    }
  }

  return (
    recordsEqual(
      first.layout,
      second.layout,
      (a, b) => a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height,
    ) && recordsEqual(first.sourceMap, second.sourceMap, (a, b) => a === b)
  );
}

export function cloneLayout(layout: DiagramLayout): DiagramLayout {
  return Object.fromEntries(
    Object.entries(layout).map(([nodeId, value]) => [nodeId, { ...value }]),
  );
}

export function cloneSourceMap(sourceMap: DiagramSourceMap): DiagramSourceMap {
  return {
    ...sourceMap,
  };
}
