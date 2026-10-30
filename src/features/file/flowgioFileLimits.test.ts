import { describe, expect, it } from "vitest";

import { DIAGRAM_LIMITS } from "@/features/diagram/limits";
import { parseDiagram } from "@/features/diagram/parser";

import { createFlowgioFile, parseFlowgioFile, serializeFlowgioFile } from "./flowgioFile";
import { readFlowgioFile } from "./flowgioFileImport";

function validFileContent(): string {
  const source = "flowchart LR\nA -> B";
  const { document } = parseDiagram(source);

  return serializeFlowgioFile(createFlowgioFile("Test", source, document));
}

describe("parseFlowgioFile hardening", () => {
  it("accepts a valid file", () => {
    expect(parseFlowgioFile(validFileContent()).title).toBe("Test");
  });

  it("rejects oversized content", () => {
    expect(() => parseFlowgioFile("x".repeat(DIAGRAM_LIMITS.maxFileBytes + 1))).toThrow(
      /too large/,
    );
  });

  it("rejects oversized titles and sources", () => {
    const file = JSON.parse(validFileContent()) as Record<string, unknown>;

    expect(() =>
      parseFlowgioFile(
        JSON.stringify({ ...file, title: "t".repeat(DIAGRAM_LIMITS.maxTitleLength + 1) }),
      ),
    ).toThrow(/title/);

    expect(() =>
      parseFlowgioFile(
        JSON.stringify({ ...file, source: "s".repeat(DIAGRAM_LIMITS.maxSourceLength + 1) }),
      ),
    ).toThrow(/source/);
  });

  it("explains why the embedded document was rejected", () => {
    const file = JSON.parse(validFileContent()) as { document: { layout: object } };

    file.document.layout = {};

    expect(() => parseFlowgioFile(JSON.stringify(file))).toThrow(/Invalid .flowgio document:/);
  });
});

describe("readFlowgioFile", () => {
  it("rejects oversized files before reading them", async () => {
    const file = { size: DIAGRAM_LIMITS.maxFileBytes + 1, text: () => Promise.resolve("") };

    await expect(readFlowgioFile(file as unknown as File)).rejects.toThrow(/too large/);
  });

  it("reads normal files", async () => {
    const file = new File(["hello"], "a.flowgio");

    await expect(readFlowgioFile(file)).resolves.toBe("hello");
  });
});
