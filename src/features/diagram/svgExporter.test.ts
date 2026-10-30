import { describe, expect, it } from "vitest";

import { exportDiagramToSvg } from "./svgExporter";

import type { DiagramDocument } from "./types";

function createDocument(shape: DiagramDocument["nodes"][number]["shape"]): DiagramDocument {
  return {
    direction: "LR",

    nodes: [
      {
        id: "node_a",
        label: "Start",
        shape,
      },
      {
        id: "node_b",
        label: "End",
        shape: "rectangle",
      },
    ],

    edges: [
      {
        id: "edge_a_b",
        from: "node_a",
        to: "node_b",
        label: "next",
      },
    ],

    layout: {
      node_a: {
        x: 0,
        y: 0,
        width: 100,
        height: 50,
      },
      node_b: {
        x: 180,
        y: 0,
        width: 100,
        height: 50,
      },
    },

    sourceMap: {
      A: "node_a",
      B: "node_b",
    },
  };
}

describe("exportDiagramToSvg", () => {
  it("creates a valid SVG document", () => {
    const svg = exportDiagramToSvg(createDocument("rectangle"));

    expect(svg).toContain('<?xml version="1.0"');

    expect(svg).toContain("<svg");

    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');

    expect(svg).toContain("</svg>");
  });

  it("exports node labels", () => {
    const svg = exportDiagramToSvg(createDocument("rectangle"));

    expect(svg).toContain("Start");

    expect(svg).toContain("End");

    expect(svg).toContain("next");
  });

  it("exports all node shapes", () => {
    const shapes = ["rectangle", "rounded", "circle", "diamond"] as const;

    for (const shape of shapes) {
      const svg = exportDiagramToSvg(createDocument(shape));

      expect(svg).toContain('data-node-id="node_a"');
    }
  });

  it("exports edges with arrow markers", () => {
    const svg = exportDiagramToSvg(createDocument("rectangle"));

    expect(svg).toContain('data-edge-id="edge_a_b"');

    expect(svg).toContain('marker-end="url(#flowgio-arrow)"');

    expect(svg).toContain('id="flowgio-arrow"');
  });

  it("calculates a padded viewBox", () => {
    const svg = exportDiagramToSvg(createDocument("rectangle"));

    const match = svg.match(/viewBox="([^"]+)"/);

    expect(match).toBeDefined();

    const [minX, minY, width, height] = match![1].split(/\s+/).map(Number);

    const maxX = minX + width;
    const maxY = minY + height;

    expect(minX).toBeLessThanOrEqual(0);
    expect(minY).toBeLessThanOrEqual(0);

    expect(maxX).toBeGreaterThanOrEqual(280);
    expect(maxY).toBeGreaterThanOrEqual(50);
  });

  it("escapes XML-sensitive labels", () => {
    const document = createDocument("rectangle");

    document.nodes[0].label = '<Start> & "Ready"';

    const svg = exportDiagramToSvg(document);

    expect(svg).toContain("&lt;Start&gt;");
    expect(svg).toContain("&amp;");
    expect(svg).toContain("&quot;Ready&quot;");

    expect(svg).not.toContain("<Start>");
    expect(svg).not.toContain('"Ready"');
  });

  it("renders rectangle shape", () => {
    const svg = exportDiagramToSvg(createDocument("rectangle"));

    expect(svg).toContain("<rect");
  });

  it("renders rounded shape", () => {
    const svg = exportDiagramToSvg(createDocument("rounded"));

    expect(svg).toContain('rx="12"');
  });

  it("renders circle shape", () => {
    const svg = exportDiagramToSvg(createDocument("circle"));

    expect(svg).toContain("<ellipse");
  });

  it("renders diamond shape", () => {
    const svg = exportDiagramToSvg(createDocument("diamond"));

    expect(svg).toContain("<polygon");
  });

  it("wraps long node labels", () => {
    const document = createDocument("rectangle");

    document.nodes[0].label = "This is a very long node label that should wrap onto multiple lines";

    const svg = exportDiagramToSvg(document);

    expect(svg).toContain("<tspan");
    expect((svg.match(/<tspan/g) ?? []).length).toBeGreaterThan(1);
  });

  it("preserves explicit line breaks", () => {
    const document = createDocument("rectangle");

    document.nodes[0].label = "Line one\nLine two";

    const svg = exportDiagramToSvg(document);

    expect(svg).toContain("Line one");

    expect(svg).toContain("Line two");
  });

  it("includes routed edges in the export bounds", () => {
    const document = createDocument("rectangle");

    document.nodes.push({
      id: "node-2",
      label: "Second",
      shape: "rectangle",
    });

    document.layout["node-2"] = {
      x: 400,
      y: 100,
      width: 100,
      height: 60,
    };

    document.edges.push({
      id: "edge-1",
      from: "node-1",
      to: "node-2",
    });

    const svg = exportDiagramToSvg(document);

    const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];

    expect(viewBox).toBeDefined();

    const [minX, , width, height] = viewBox!.split(/\s+/).map(Number);

    expect(minX).toBeLessThan(0);
    expect(width).toBeGreaterThan(400);
    expect(height).toBeGreaterThan(0);
  });

  it("exports using the light theme", () => {
    const document = createDocument("rectangle");

    const svg = exportDiagramToSvg(document, "light");

    expect(svg).toContain('fill="#ffffff"');

    expect(svg).toContain('fill="#1f2328"');
  });

  it("exports using the midnight theme", () => {
    const document = createDocument("rectangle");

    const svg = exportDiagramToSvg(document, "midnight");

    expect(svg).toContain('fill="#0b1020"');

    expect(svg).toContain('fill="#11182d"');
  });

  it("uses dark theme by default", () => {
    const document = createDocument("rectangle");

    const svg = exportDiagramToSvg(document);

    expect(svg).toContain('fill="#0d1117"');
  });
});
