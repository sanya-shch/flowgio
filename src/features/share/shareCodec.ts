import { DIAGRAM_LIMITS } from "@/features/diagram/limits";
import type { DiagramDocument } from "@/features/diagram/types";
import { validateDiagramDocument } from "./shareValidator";

const SHARE_VERSION = 1;

interface SharePayload {
  v: number;
  document: DiagramDocument;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");

  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));

  const binary = atob(normalized + padding);

  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function encodeSharePayload(document: DiagramDocument): string {
  const payload: SharePayload = {
    v: SHARE_VERSION,
    document,
  };

  return encodeBase64Url(JSON.stringify(payload));
}

export function decodeSharePayload(value: string): DiagramDocument {
  if (value.length > DIAGRAM_LIMITS.maxSharePayloadLength) {
    throw new Error("Share link is too large");
  }

  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new Error("Share link is malformed");
  }

  let payload: unknown;

  try {
    payload = JSON.parse(decodeBase64Url(value));
  } catch {
    throw new Error("Share link is corrupted");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Invalid share payload");
  }

  const record = payload as Record<string, unknown>;

  if (record.v !== SHARE_VERSION) {
    throw new Error(`Unsupported share version: ${String(record.v)}`);
  }

  const result = validateDiagramDocument(record.document);

  if (!result.ok) {
    throw new Error(`Invalid diagram document: ${result.reason}`);
  }

  return result.value;
}
