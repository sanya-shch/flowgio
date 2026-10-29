import { toRaw } from "vue";
import { DIAGRAM_LIMITS } from "@/features/diagram/limits";
import type { DiagramDocument } from "@/features/diagram/types";
import { validateDiagramDocument } from "@/features/share/shareValidator";

export const DEVCANVAS_FORMAT = "devcanvas";

export const DEVCANVAS_VERSION = 1;

export interface DevCanvasFile {
  format: typeof DEVCANVAS_FORMAT;
  version: typeof DEVCANVAS_VERSION;
  title: string;
  source: string;
  document: DiagramDocument;
}

export interface ImportedDevCanvasFile {
  title: string;
  source: string;
  document: DiagramDocument;
}

export function createDevCanvasFile(
  title: string,
  source: string,
  document: DiagramDocument,
): DevCanvasFile {
  const rawDocument = toRaw(document);

  return {
    format: DEVCANVAS_FORMAT,
    version: DEVCANVAS_VERSION,
    title,
    source,
    document: structuredClone(rawDocument),
  };
}

export function serializeDevCanvasFile(file: DevCanvasFile): string {
  return JSON.stringify(file, null, 2);
}

export function parseDevCanvasFile(content: string): ImportedDevCanvasFile {
  if (content.length > DIAGRAM_LIMITS.maxFileBytes) {
    throw new Error("Invalid .devcanvas file: file is too large");
  }

  let value: unknown;

  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("Invalid .devcanvas file: invalid JSON");
  }

  if (!value || typeof value !== "object") {
    throw new Error("Invalid .devcanvas file");
  }

  const file = value as Record<string, unknown>;

  if (file.format !== DEVCANVAS_FORMAT) {
    throw new Error("Invalid .devcanvas file format");
  }

  if (file.version !== DEVCANVAS_VERSION) {
    throw new Error(`Unsupported .devcanvas version: ${String(file.version)}`);
  }

  if (typeof file.title !== "string" || file.title.length > DIAGRAM_LIMITS.maxTitleLength) {
    throw new Error("Invalid .devcanvas title");
  }

  if (typeof file.source !== "string" || file.source.length > DIAGRAM_LIMITS.maxSourceLength) {
    throw new Error("Invalid .devcanvas source");
  }

  const result = validateDiagramDocument(file.document);

  if (!result.ok) {
    throw new Error(`Invalid .devcanvas document: ${result.reason}`);
  }

  return {
    title: file.title,
    source: file.source,
    document: structuredClone(result.value),
  };
}
