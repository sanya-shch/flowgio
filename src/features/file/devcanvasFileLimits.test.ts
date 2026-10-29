import { describe, expect, it } from "vitest";

import { DIAGRAM_LIMITS } from "@/features/diagram/limits";
import { parseDiagram } from "@/features/diagram/parser";

import { createDevCanvasFile, parseDevCanvasFile, serializeDevCanvasFile } from "./devcanvasFile";
import { readDevCanvasFile } from "./devcanvasFileImport";

function validFileContent(): string {
  const source = "flowchart LR\nA -> B";
  const { document } = parseDiagram(source);

  return serializeDevCanvasFile(createDevCanvasFile("Test", source, document));
}

describe("parseDevCanvasFile hardening", () => {
  it("accepts a valid file", () => {
    expect(parseDevCanvasFile(validFileContent()).title).toBe("Test");
  });

  it("rejects oversized content", () => {
    expect(() => parseDevCanvasFile("x".repeat(DIAGRAM_LIMITS.maxFileBytes + 1))).toThrow(
      /too large/,
    );
  });

  it("rejects oversized titles and sources", () => {
    const file = JSON.parse(validFileContent()) as Record<string, unknown>;

    expect(() =>
      parseDevCanvasFile(
        JSON.stringify({ ...file, title: "t".repeat(DIAGRAM_LIMITS.maxTitleLength + 1) }),
      ),
    ).toThrow(/title/);

    expect(() =>
      parseDevCanvasFile(
        JSON.stringify({ ...file, source: "s".repeat(DIAGRAM_LIMITS.maxSourceLength + 1) }),
      ),
    ).toThrow(/source/);
  });

  it("explains why the embedded document was rejected", () => {
    const file = JSON.parse(validFileContent()) as { document: { layout: object } };

    file.document.layout = {};

    expect(() => parseDevCanvasFile(JSON.stringify(file))).toThrow(/Invalid .devcanvas document:/);
  });
});

describe("readDevCanvasFile", () => {
  it("rejects oversized files before reading them", async () => {
    const file = { size: DIAGRAM_LIMITS.maxFileBytes + 1, text: () => Promise.resolve("") };

    await expect(readDevCanvasFile(file as unknown as File)).rejects.toThrow(/too large/);
  });

  it("reads normal files", async () => {
    const file = new File(["hello"], "a.devcanvas");

    await expect(readDevCanvasFile(file)).resolves.toBe("hello");
  });
});
