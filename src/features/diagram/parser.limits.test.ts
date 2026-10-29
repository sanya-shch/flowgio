import { describe, expect, it } from "vitest";

import { DIAGRAM_LIMITS } from "./limits";
import { parseDiagram } from "./parser";

describe("parser: input limits", () => {
  it("rejects oversized source without parsing it", () => {
    const result = parseDiagram(`flowchart LR\n${"A -> B\n".repeat(60_000)}`);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.message).toMatch(/too large/i);
    expect(result.document.nodes).toEqual([]);
  });

  it("rejects diagrams with too many nodes", () => {
    const lines = ["flowchart LR"];

    for (let index = 0; index <= DIAGRAM_LIMITS.maxNodes; index += 1) {
      lines.push(`n${index} -> n${index + 1}`);
    }

    const result = parseDiagram(lines.join("\n"));

    expect(result.errors.at(-1)?.message).toMatch(/too large/i);
  });

  it("rejects oversized labels", () => {
    const label = "x".repeat(DIAGRAM_LIMITS.maxLabelLength + 1);
    const result = parseDiagram(`flowchart LR\nA["${label}"] -> B`);

    expect(result.errors[0]?.message).toMatch(/limited to/i);
  });

  it("rejects over-long identifiers", () => {
    const id = "a".repeat(DIAGRAM_LIMITS.maxIdLength + 1);
    const result = parseDiagram(`flowchart LR\n${id} -> B`);

    expect(result.errors[0]?.message).toMatch(/Identifiers are limited/);
  });

  it("stops collecting errors after a cap", () => {
    const result = parseDiagram(`flowchart LR\n${"this is not valid\n".repeat(5_000)}`);

    expect(result.errors.length).toBeLessThanOrEqual(DIAGRAM_LIMITS.maxParseErrors + 1);
    expect(result.errors.at(-1)?.message).toMatch(/Too many errors/);
  });

  it("accepts a diagram right at a realistic large size", () => {
    const lines = ["flowchart LR"];

    for (let index = 0; index < 1500; index += 1) {
      lines.push(`n${index} -> n${index + 1}`);
    }

    expect(parseDiagram(lines.join("\n")).errors).toEqual([]);
  });
});
