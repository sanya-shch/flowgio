import { afterEach, describe, expect, it } from "vitest";

import { DIAGRAM_LIMITS } from "@/features/diagram/limits";
import { parseDiagram } from "@/features/diagram/parser";

import { decodeSharePayload, encodeSharePayload } from "./shareCodec";
import { readSharedDocument } from "./shareUrl";

function setHash(hash: string) {
  window.location.hash = hash;
}

afterEach(() => setHash(""));

describe("decodeSharePayload hardening", () => {
  it("round-trips a parsed document", () => {
    const { document } = parseDiagram('flowchart LR\nA["Start"] -> B["End"]');

    expect(decodeSharePayload(encodeSharePayload(document))).toEqual(document);
  });

  it("rejects oversized payloads before decoding", () => {
    expect(() => decodeSharePayload("A".repeat(DIAGRAM_LIMITS.maxSharePayloadLength + 1))).toThrow(
      /too large/,
    );
  });

  it("rejects malformed and corrupted payloads with readable errors", () => {
    expect(() => decodeSharePayload("not base64!!")).toThrow(/malformed/);
    expect(() => decodeSharePayload("AAAA")).toThrow(/corrupted/);
  });

  it("explains why a structurally invalid document was rejected", () => {
    const payload = encodeSharePayload({
      direction: "LR",
      nodes: [{ id: "a", label: "A", shape: "rectangle" }],
      edges: [],
      layout: {},
      sourceMap: {},
    });

    expect(() => decodeSharePayload(payload)).toThrow(/Invalid diagram document: layout/);
  });
});

describe("readSharedDocument", () => {
  it("returns none when there is no share hash", () => {
    expect(readSharedDocument()).toEqual({ status: "none" });
  });

  it("returns an error result instead of throwing on a broken link", () => {
    setHash("share=%%%");

    const result = readSharedDocument();

    expect(result.status).toBe("error");
  });

  it("returns the document for a valid link", () => {
    const { document } = parseDiagram("flowchart LR\nA -> B");

    setHash(`share=${encodeSharePayload(document)}`);

    const result = readSharedDocument();

    expect(result.status).toBe("ok");
  });
});
