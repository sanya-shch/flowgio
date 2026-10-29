import { describe, expect, it } from "vitest";

import { parseDiagram } from "./parser";
import { serializeDiagram } from "./serializer";

describe("parser: prototype-safe identifiers", () => {
  const protoNames = ["constructor", "toString", "hasOwnProperty", "valueOf", "__proto__"];

  it.each(protoNames)("keeps %s a regular string node id on re-parse", (name) => {
    const first = parseDiagram("flowchart LR\nA -> B");
    const second = parseDiagram(`flowchart LR\nA -> ${name}`, first.document);

    expect(second.errors).toEqual([]);

    for (const node of second.document.nodes) {
      expect(typeof node.id).toBe("string");
      expect(node.id).toMatch(/^node_/);
    }

    for (const key of Object.keys(second.document.layout)) {
      expect(key).toMatch(/^node_/);
    }

    expect(new Set(second.document.nodes.map((node) => node.id)).size).toBe(2);
  });

  it("keeps ids stable for ordinary names across re-parses", () => {
    const first = parseDiagram("flowchart LR\nA -> B");
    const second = parseDiagram("flowchart LR\nA -> B\nB -> C", first.document);

    const idOf = (doc: typeof first.document, label: string) =>
      doc.nodes.find((node) => node.label === label)?.id;

    expect(idOf(second.document, "A")).toBe(idOf(first.document, "A"));
    expect(idOf(second.document, "B")).toBe(idOf(first.document, "B"));
  });
});

describe("parser: escape sequences", () => {
  it("does not turn an escaped backslash followed by n into a newline", () => {
    const { document, errors } = parseDiagram('flowchart LR\nA["x\\\\ny"] -> B');

    expect(errors).toEqual([]);
    expect(document.nodes[0]?.label).toBe("x\\ny");
  });

  it("still decodes real escapes", () => {
    const { document } = parseDiagram('flowchart LR\nA["a\\nb\\t\\"q\\""] -> B');

    expect(document.nodes[0]?.label).toBe('a\nb\t"q"');
  });

  it("round-trips labels containing backslashes", () => {
    const first = parseDiagram('flowchart LR\nA["C:\\\\new\\\\table"] -> B');
    const again = parseDiagram(serializeDiagram(first.document));

    expect(again.document.nodes[0]?.label).toBe(first.document.nodes[0]?.label);
  });
});

describe("parser: edge de-duplication", () => {
  it("collapses identical edges but keeps differently labelled ones", () => {
    const { document } = parseDiagram('flowchart LR\nA -> B\nA -> B\nA -- "x" -> B\nA -- "x" -> B');

    expect(document.edges).toHaveLength(2);
  });

  it("parses thousands of edges in reasonable time", () => {
    const lines = ["flowchart LR"];

    for (let index = 0; index < 2500; index += 1) {
      lines.push(`n${index} -> n${index + 1}`);
    }

    const started = performance.now();
    const { document } = parseDiagram(lines.join("\n"));

    expect(document.edges).toHaveLength(2500);
    expect(performance.now() - started).toBeLessThan(5000);
  });
});
