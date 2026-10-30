import { describe, expect, it } from "vitest";

import type { DiagramDocument } from "@/features/diagram/types";

import { createFlowgioFile, parseFlowgioFile, serializeFlowgioFile } from "./flowgioFile";

function createDocument(): DiagramDocument {
  return {
    direction: "LR",

    nodes: [
      {
        id: "node-a",
        label: "Browser",
        shape: "rounded",
      },
      {
        id: "node-b",
        label: "API",
        shape: "rectangle",
      },
    ],

    edges: [
      {
        id: "edge-a-b",
        from: "node-a",
        to: "node-b",
        label: "HTTP",
      },
    ],

    layout: {
      "node-a": {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      },

      "node-b": {
        x: 200,
        y: 0,
        width: 100,
        height: 50,
      },
    },

    sourceMap: {
      Browser: "node-a",
      API: "node-b",
    },
  };
}

describe(".flowgio file", () => {
  it("creates a valid file", () => {
    const document = createDocument();

    const file = createFlowgioFile(
      "Architecture",
      'flowchart LR\nBrowser["Browser"] -> API["API"]',
      document,
    );

    expect(file.format).toBe("flowgio");

    expect(file.version).toBe(1);
    expect(file.title).toBe("Architecture");
    expect(file.document).toEqual(document);
  });

  it("serializes valid JSON", () => {
    const file = createFlowgioFile("Architecture", "flowchart LR", createDocument());

    const content = serializeFlowgioFile(file);

    expect(() => JSON.parse(content)).not.toThrow();

    expect(content).toContain('"format": "flowgio"');

    expect(content).toContain('"version": 1');
  });

  it("round-trips a file", () => {
    const document = createDocument();

    const file = createFlowgioFile("Architecture", "flowchart LR\nA -> B", document);

    const serialized = serializeFlowgioFile(file);

    const imported = parseFlowgioFile(serialized);

    expect(imported.title).toBe("Architecture");

    expect(imported.source).toBe("flowchart LR\nA -> B");

    expect(imported.document).toEqual(document);
  });

  it("preserves unicode", () => {
    const document = createDocument();

    document.nodes[0].label = "Браузер 🌐";

    const file = createFlowgioFile("Архітектура", 'flowchart LR\nA["Привіт 🌍"]', document);

    const serialized = serializeFlowgioFile(file);

    const imported = parseFlowgioFile(serialized);

    expect(imported.title).toBe("Архітектура");

    expect(imported.document.nodes[0].label).toBe("Браузер 🌐");
  });

  it("rejects invalid JSON", () => {
    expect(() => parseFlowgioFile("{invalid")).toThrow("invalid JSON");
  });

  it("rejects an unknown format", () => {
    const content = JSON.stringify({
      format: "something-else",
      version: 1,
    });

    expect(() => parseFlowgioFile(content)).toThrow("format");
  });

  it("rejects an unsupported version", () => {
    const content = JSON.stringify({
      format: "flowgio",
      version: 999,
      title: "Test",
      source: "",
      document: createDocument(),
    });

    expect(() => parseFlowgioFile(content)).toThrow("Unsupported .flowgio version");
  });

  it("rejects an invalid document", () => {
    const content = JSON.stringify({
      format: "flowgio",
      version: 1,
      title: "Test",
      source: "flowchart LR",
      document: {
        direction: "LR",
        nodes: [
          {
            id: "a",
            label: "A",
            shape: "invalid",
          },
        ],
        edges: [],
        layout: {},
        sourceMap: {},
      },
    });

    expect(() => parseFlowgioFile(content)).toThrow("Invalid .flowgio document");
  });
});
