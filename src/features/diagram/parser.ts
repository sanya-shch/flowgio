import type {
  DiagramDirection,
  DiagramDocument,
  DiagramEdge,
  DiagramNode,
  ParseError,
  ParseResult,
} from "./types";
import { DEFAULT_NODE_SHAPE, normalizeNodeShape } from "./nodeShape";
import { createNodeLayout } from "./layout";
import { DIAGRAM_LIMITS } from "./limits";

function generateNodeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `node_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  }

  return `node_${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
}

function generateEdgeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `edge_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
  }

  return `edge_${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
}

interface ParsedNode {
  sourceId: string;
  label: string;
}

interface ParsedEdge {
  from: ParsedNode;
  to: ParsedNode;
  label?: string;
}

interface ParserContext {
  direction: DiagramDirection;
  nodes: Map<string, DiagramNode>;
  edges: DiagramEdge[];
  sourceMap: Record<string, string>;
  edgeKeys: Set<string>;
  previousNodesById: Map<string, DiagramNode>;
  errors: ParseError[];
  previousDocument?: DiagramDocument;
}

function createParseError(line: number, message: string): ParseError {
  return {
    line,
    message,
  };
}

const ESCAPE_SEQUENCES: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
  '"': '"',
  "'": "'",
  "\\": "\\",
};

/*
 * Single pass: a chained .replace() would re-interpret the output of a previous
 * step (e.g. an escaped backslash followed by "n" must stay backslash + "n").
 */
function unescapeQuotedValue(value: string): string {
  return value.replace(/\\([nrt"'\\])/g, (_match, char: string) => ESCAPE_SEQUENCES[char] ?? char);
}

function findClosingQuote(value: string, start: number): number {
  const quote = value[start];

  for (let index = start + 1; index < value.length; index += 1) {
    if (value[index] === "\\") {
      index += 1;
      continue;
    }

    if (value[index] === quote) {
      return index;
    }
  }

  return -1;
}

function parseNodeReference(value: string, line: number, errors: ParseError[]): ParsedNode | null {
  const input = value.trim();

  if (!input) {
    errors.push(createParseError(line, "Node reference cannot be empty."));

    return null;
  }

  const match = input.match(/^([A-Za-z_][A-Za-z0-9_-]*)(.*)$/);

  if (!match) {
    errors.push(createParseError(line, `Invalid node identifier: "${input}".`));

    return null;
  }

  const sourceId = match[1];
  const suffix = match[2].trim();

  if (!suffix) {
    return {
      sourceId,
      label: sourceId,
    };
  }

  const opening = suffix[0];

  const closingByOpening: Record<string, string> = {
    "[": "]",
    "{": "}",
    "(": ")",
  };

  const closing = closingByOpening[opening];

  if (!closing) {
    errors.push(createParseError(line, `Invalid node declaration for "${sourceId}".`));

    return null;
  }

  if (!suffix.endsWith(closing)) {
    errors.push(createParseError(line, `Unclosed node label for "${sourceId}".`));

    return null;
  }

  const content = suffix.slice(1, -1).trim();

  if (!content) {
    return {
      sourceId,
      label: sourceId,
    };
  }

  const quote = content[0];

  if (quote === '"' || quote === "'") {
    const closingQuote = findClosingQuote(content, 0);

    if (closingQuote === -1 || closingQuote !== content.length - 1) {
      errors.push(createParseError(line, `Invalid quoted label for "${sourceId}".`));

      return null;
    }

    return {
      sourceId,
      label: unescapeQuotedValue(content.slice(1, closingQuote)),
    };
  }

  return {
    sourceId,
    label: content,
  };
}

function parseEdgeLabel(value: string, line: number, errors: ParseError[]): string | undefined {
  const input = value.trim();

  if (!input) {
    return undefined;
  }

  const quote = input[0];

  if (quote === '"' || quote === "'") {
    const closingQuote = findClosingQuote(input, 0);

    if (closingQuote === -1 || closingQuote !== input.length - 1) {
      errors.push(createParseError(line, "Invalid quoted edge label."));

      return undefined;
    }

    return unescapeQuotedValue(input.slice(1, closingQuote));
  }

  return input;
}

function parseEdgeStatement(
  statement: string,
  line: number,
  errors: ParseError[],
): ParsedEdge | null {
  const labelSeparator = statement.indexOf("--");

  if (labelSeparator !== -1) {
    const left = statement.slice(0, labelSeparator).trim();

    const remainder = statement.slice(labelSeparator + 2).trim();

    const arrowIndex = remainder.indexOf("->");

    if (arrowIndex === -1) {
      errors.push(createParseError(line, 'Expected "->" after edge label.'));

      return null;
    }

    const labelValue = remainder.slice(0, arrowIndex).trim();

    const right = remainder.slice(arrowIndex + 2).trim();

    const from = parseNodeReference(left, line, errors);

    const to = parseNodeReference(right, line, errors);

    if (!from || !to) {
      return null;
    }

    const label = parseEdgeLabel(labelValue, line, errors);

    return {
      from,
      to,
      ...(label !== undefined ? { label } : {}),
    };
  }

  const arrowIndex = statement.indexOf("->");

  if (arrowIndex === -1) {
    errors.push(createParseError(line, 'Expected "->" edge operator.'));

    return null;
  }

  const left = statement.slice(0, arrowIndex).trim();

  const right = statement.slice(arrowIndex + 2).trim();

  if (!left || !right) {
    errors.push(createParseError(line, "Both source and target nodes are required."));

    return null;
  }

  const from = parseNodeReference(left, line, errors);

  const to = parseNodeReference(right, line, errors);

  if (!from || !to) {
    return null;
  }

  return {
    from,
    to,
  };
}

function getOrCreateNodeId(sourceId: string, previousDocument?: DiagramDocument): string {
  /*
   * sourceId is user input: never read it through the prototype chain, otherwise
   * names like "constructor" or "toString" resolve to built-in functions.
   */
  const previousSourceMap = previousDocument?.sourceMap;

  if (previousSourceMap && Object.hasOwn(previousSourceMap, sourceId)) {
    const existingId = previousSourceMap[sourceId];

    if (typeof existingId === "string" && existingId) {
      return existingId;
    }
  }

  return generateNodeId();
}

function getOrCreateNode(
  parsedNode: ParsedNode,
  context: ParserContext,
  line: number,
): DiagramNode {
  const existingNode = context.nodes.get(parsedNode.sourceId);

  if (existingNode) {
    if (
      existingNode.label !== parsedNode.label &&
      parsedNode.label !== parsedNode.sourceId &&
      existingNode.label !== parsedNode.sourceId
    ) {
      context.errors.push(
        createParseError(
          line,
          `Node "${parsedNode.sourceId}" has conflicting labels: "${existingNode.label}" and "${parsedNode.label}".`,
        ),
      );
    }

    return existingNode;
  }

  const id = getOrCreateNodeId(parsedNode.sourceId, context.previousDocument);

  const previousNode = context.previousNodesById.get(id);

  const node: DiagramNode = {
    id,
    label: parsedNode.label,
    shape: normalizeNodeShape(previousNode?.shape ?? DEFAULT_NODE_SHAPE),
  };

  context.nodes.set(parsedNode.sourceId, node);

  context.sourceMap[parsedNode.sourceId] = id;

  return node;
}

function createEdgeKey(from: string, to: string, label?: string): string {
  return JSON.stringify([from, to, label === undefined ? null : label]);
}

function hasOversizedLabel(parsedEdge: ParsedEdge, context: ParserContext, line: number): boolean {
  const labels = [parsedEdge.from.label, parsedEdge.to.label, parsedEdge.label];

  const oversized = labels.some(
    (label) => label !== undefined && label.length > DIAGRAM_LIMITS.maxLabelLength,
  );

  if (oversized) {
    context.errors.push(
      createParseError(line, `Labels are limited to ${DIAGRAM_LIMITS.maxLabelLength} characters.`),
    );

    return true;
  }

  const idTooLong = [parsedEdge.from.sourceId, parsedEdge.to.sourceId].some(
    (sourceId) => sourceId.length > DIAGRAM_LIMITS.maxIdLength,
  );

  if (idTooLong) {
    context.errors.push(
      createParseError(
        line,
        `Identifiers are limited to ${DIAGRAM_LIMITS.maxIdLength} characters.`,
      ),
    );
  }

  return idTooLong;
}

function addParsedEdge(parsedEdge: ParsedEdge, context: ParserContext, line: number): void {
  if (hasOversizedLabel(parsedEdge, context, line)) {
    return;
  }

  const from = getOrCreateNode(parsedEdge.from, context, line);

  const to = getOrCreateNode(parsedEdge.to, context, line);

  const edgeKey = createEdgeKey(from.id, to.id, parsedEdge.label);

  if (context.edgeKeys.has(edgeKey)) {
    return;
  }

  context.edgeKeys.add(edgeKey);

  context.edges.push({
    id: generateEdgeId(),
    from: from.id,
    to: to.id,
    ...(parsedEdge.label !== undefined ? { label: parsedEdge.label } : {}),
  });
}

function createLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  direction: DiagramDirection,
  previousDocument?: DiagramDocument,
) {
  const preservePositions = previousDocument?.direction === direction;

  const previousLayout = preservePositions ? (previousDocument?.layout ?? {}) : {};

  return createNodeLayout(nodes, edges, direction, previousLayout, preservePositions);
}

function parseDirection(
  line: string,
  lineNumber: number,
  errors: ParseError[],
): DiagramDirection | null {
  const match = line.match(/^flowchart\s+(TD|LR)\s*$/);

  if (!match) {
    errors.push(createParseError(lineNumber, 'Expected "flowchart TD" or "flowchart LR".'));

    return null;
  }

  return match[1] as DiagramDirection;
}

export function parseDiagram(source: string, previousDocument?: DiagramDocument): ParseResult {
  const errors: ParseError[] = [];

  if (source.length > DIAGRAM_LIMITS.maxSourceLength) {
    errors.push(
      createParseError(
        1,
        `Diagram source is too large (limit: ${DIAGRAM_LIMITS.maxSourceLength} characters).`,
      ),
    );

    return {
      document: previousDocument ?? createEmptyDocument(),
      errors,
    };
  }

  const lines = source.split(/\r?\n/);

  let headerFound = false;

  const context: ParserContext = {
    direction: "LR",
    nodes: new Map(),
    edges: [],
    sourceMap: Object.create(null) as Record<string, string>,
    edgeKeys: new Set(),
    previousNodesById: new Map((previousDocument?.nodes ?? []).map((node) => [node.id, node])),
    errors,
    previousDocument,
  };

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;

    if (errors.length >= DIAGRAM_LIMITS.maxParseErrors) {
      errors.push(createParseError(lineNumber, "Too many errors, parsing stopped."));

      break;
    }

    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    if (line.startsWith("//")) {
      continue;
    }

    if (!headerFound) {
      const direction = parseDirection(line, lineNumber, errors);

      if (!direction) {
        return {
          document: previousDocument ?? createEmptyDocument(),
          errors,
        };
      }

      context.direction = direction;
      headerFound = true;

      continue;
    }

    const parsedEdge = parseEdgeStatement(line, lineNumber, errors);

    if (!parsedEdge) {
      continue;
    }

    addParsedEdge(parsedEdge, context, lineNumber);

    if (
      context.nodes.size > DIAGRAM_LIMITS.maxNodes ||
      context.edges.length > DIAGRAM_LIMITS.maxEdges
    ) {
      errors.push(
        createParseError(
          lineNumber,
          `Diagram is too large (limit: ${DIAGRAM_LIMITS.maxNodes} nodes, ${DIAGRAM_LIMITS.maxEdges} edges).`,
        ),
      );

      break;
    }
  }

  if (!headerFound) {
    errors.push(createParseError(1, 'Missing "flowchart TD" or "flowchart LR" declaration.'));

    return {
      document: previousDocument ?? createEmptyDocument(),
      errors,
    };
  }

  if (context.errors.length > 0) {
    return {
      document: previousDocument ?? createEmptyDocument(),
      errors: context.errors,
    };
  }

  const nodes = Array.from(context.nodes.values());

  const document: DiagramDocument = {
    direction: context.direction,
    nodes,
    edges: context.edges,
    layout: createLayout(nodes, context.edges, context.direction, previousDocument),
    sourceMap: context.sourceMap,
  };

  return {
    document,
    errors: [],
  };
}

function createEmptyDocument(): DiagramDocument {
  return {
    direction: "LR",
    nodes: [],
    edges: [],
    layout: {},
    sourceMap: {},
  };
}
