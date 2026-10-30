import { describe, expect, it } from "vitest";

import type { DiagramDocument } from "@/features/diagram/types";

import { cloneDocument, documentsEqual } from "./cloneHelpers";

function sample(): DiagramDocument {
  return {
    direction: "LR",
    nodes: [
      { id: "a", label: "A", shape: "rectangle" },
      { id: "b", label: "B", shape: "circle" },
    ],
    edges: [{ id: "e1", from: "a", to: "b", label: "go", routing: "around" }],
    layout: {
      a: { x: 0, y: 0, width: 100, height: 50 },
      b: { x: 200, y: 0, width: 100, height: 50 },
    },
    sourceMap: { A: "a", B: "b" },
  };
}

describe("documentsEqual", () => {
  it("treats a clone as equal", () => {
    expect(documentsEqual(sample(), cloneDocument(sample()))).toBe(true);
  });

  it("ignores key order and undefined optional fields", () => {
    const reordered = sample();

    reordered.layout = { b: reordered.layout.b!, a: reordered.layout.a! };
    reordered.sourceMap = { B: "b", A: "a" };

    const plain = sample();

    plain.edges[0] = { id: "e1", from: "a", to: "b", label: undefined, routing: "around" };

    const other = sample();

    delete other.edges[0]!.label;

    expect(documentsEqual(sample(), reordered)).toBe(true);
    expect(documentsEqual(plain, other)).toBe(true);
  });

  // Every field of the document type must be detected; if a field is added to
  // the types and not to documentsEqual, add it here and to the comparison.
  const mutations: Array<[string, (document: DiagramDocument) => void]> = [
    ["direction", (d) => (d.direction = "TD")],
    ["node id", (d) => (d.nodes[0]!.id = "z")],
    ["node label", (d) => (d.nodes[0]!.label = "Z")],
    ["node shape", (d) => (d.nodes[0]!.shape = "diamond")],
    ["node count", (d) => d.nodes.pop()],
    ["edge id", (d) => (d.edges[0]!.id = "z")],
    ["edge from", (d) => (d.edges[0]!.from = "b")],
    ["edge to", (d) => (d.edges[0]!.to = "a")],
    ["edge label", (d) => (d.edges[0]!.label = "other")],
    ["edge routing", (d) => (d.edges[0]!.routing = "direct")],
    ["edge count", (d) => d.edges.pop()],
    ["layout x", (d) => (d.layout.a!.x = 1)],
    ["layout y", (d) => (d.layout.a!.y = 1)],
    ["layout width", (d) => (d.layout.a!.width = 1)],
    ["layout height", (d) => (d.layout.a!.height = 1)],
    ["layout key", (d) => delete d.layout.b],
    ["sourceMap value", (d) => (d.sourceMap.A = "b")],
    ["sourceMap key", (d) => delete d.sourceMap.B],
  ];

  it.each(mutations)("detects a change in %s", (_name, mutate) => {
    const changed = sample();

    mutate(changed);

    expect(documentsEqual(sample(), changed)).toBe(false);
    expect(documentsEqual(changed, sample())).toBe(false);
  });
});
