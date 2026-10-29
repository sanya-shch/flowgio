import { describe, expect, it } from "vitest";

import { DIAGRAM_LIMITS } from "@/features/diagram/limits";
import type { DiagramDocument } from "@/features/diagram/types";

import { isDiagramDocument, validateDiagramDocument } from "./shareValidator";

function validDocument(): DiagramDocument {
  return {
    direction: "LR",
    nodes: [
      { id: "node_a", label: "A", shape: "rectangle" },
      { id: "node_b", label: "B", shape: "circle" },
    ],
    edges: [{ id: "edge_1", from: "node_a", to: "node_b" }],
    layout: {
      node_a: { x: 0, y: 0, width: 120, height: 48 },
      node_b: { x: 200, y: 0, width: 120, height: 48 },
    },
    sourceMap: { A: "node_a", B: "node_b" },
  };
}

function reasonFor(mutate: (document: DiagramDocument) => void): string {
  const document = validDocument();

  mutate(document);

  const result = validateDiagramDocument(document);

  return result.ok ? "" : result.reason;
}

describe("validateDiagramDocument", () => {
  it("accepts a well-formed document", () => {
    expect(isDiagramDocument(validDocument())).toBe(true);
  });

  it("rejects non-object input", () => {
    for (const value of [null, undefined, 1, "x", [], true]) {
      expect(isDiagramDocument(value)).toBe(false);
    }
  });

  it("rejects duplicate node and edge ids", () => {
    expect(
      reasonFor((document) => {
        document.nodes.push({ id: "node_a", label: "dup", shape: "rectangle" });
      }),
    ).toMatch(/duplicate node id/);

    expect(
      reasonFor((document) => {
        document.edges.push({ id: "edge_1", from: "node_a", to: "node_b" });
      }),
    ).toMatch(/duplicate edge id/);
  });

  it.each(["__proto__", "constructor", "toString", "has space", 'a"b', "<x>", ""])(
    "rejects unsafe node id %j",
    (id) => {
      const document = validDocument();

      document.nodes[0] = { id, label: "A", shape: "rectangle" };

      expect(isDiagramDocument(document)).toBe(false);
    },
  );

  it("requires a layout entry for every node and nothing else", () => {
    expect(
      reasonFor((document) => {
        delete document.layout.node_b;
      }),
    ).toMatch(/exactly one entry/);

    expect(
      reasonFor((document) => {
        document.layout.ghost = { x: 0, y: 0, width: 10, height: 10 };
      }),
    ).toMatch(/exactly one entry|does not match/);
  });

  it("bounds layout numbers", () => {
    expect(
      reasonFor((document) => {
        document.layout.node_a!.x = 1e308;
      }),
    ).toMatch(/invalid/);

    expect(
      reasonFor((document) => {
        document.layout.node_a!.width = DIAGRAM_LIMITS.maxNodeSize + 1;
      }),
    ).toMatch(/invalid/);

    expect(
      reasonFor((document) => {
        document.layout.node_a!.height = 0;
      }),
    ).toMatch(/invalid/);

    expect(
      reasonFor((document) => {
        document.layout.node_a!.y = Number.NaN;
      }),
    ).toMatch(/invalid/);
  });

  it("rejects dangling edges and sourceMap entries", () => {
    expect(
      reasonFor((document) => {
        document.edges[0]!.to = "missing";
      }),
    ).toMatch(/unknown target/);

    expect(
      reasonFor((document) => {
        document.sourceMap.Z = "missing";
      }),
    ).toMatch(/sourceMap/);
  });

  it("enforces size limits", () => {
    expect(
      reasonFor((document) => {
        document.nodes[0]!.label = "x".repeat(DIAGRAM_LIMITS.maxLabelLength + 1);
      }),
    ).toMatch(/label/);

    expect(
      reasonFor((document) => {
        for (let index = 0; index <= DIAGRAM_LIMITS.maxNodes; index += 1) {
          document.nodes.push({ id: `extra_${index}`, label: "x", shape: "rectangle" });
        }
      }),
    ).toMatch(/too many nodes/);
  });

  it("is not affected by a JSON-parsed __proto__ key", () => {
    const document = JSON.parse(
      '{"direction":"LR","nodes":[],"edges":[],"layout":{"__proto__":{"x":1,"y":1,"width":1,"height":1}},"sourceMap":{}}',
    ) as unknown;

    expect(isDiagramDocument(document)).toBe(false);
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});
