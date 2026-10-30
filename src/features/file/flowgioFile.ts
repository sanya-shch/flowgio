import { toRaw } from "vue";
import { DIAGRAM_LIMITS } from "@/features/diagram/limits";
import type { DiagramDocument } from "@/features/diagram/types";
import { validateDiagramDocument } from "@/features/share/shareValidator";

export const FLOWGIO_FORMAT = "flowgio";

export const FLOWGIO_VERSION = 1;

export interface FlowgioFile {
  format: typeof FLOWGIO_FORMAT;
  version: typeof FLOWGIO_VERSION;
  title: string;
  source: string;
  document: DiagramDocument;
}

export interface ImportedFlowgioFile {
  title: string;
  source: string;
  document: DiagramDocument;
}

export function createFlowgioFile(
  title: string,
  source: string,
  document: DiagramDocument,
): FlowgioFile {
  const rawDocument = toRaw(document);

  return {
    format: FLOWGIO_FORMAT,
    version: FLOWGIO_VERSION,
    title,
    source,
    document: structuredClone(rawDocument),
  };
}

export function serializeFlowgioFile(file: FlowgioFile): string {
  return JSON.stringify(file, null, 2);
}

export function parseFlowgioFile(content: string): ImportedFlowgioFile {
  if (content.length > DIAGRAM_LIMITS.maxFileBytes) {
    throw new Error("Invalid .flowgio file: file is too large");
  }

  let value: unknown;

  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("Invalid .flowgio file: invalid JSON");
  }

  if (!value || typeof value !== "object") {
    throw new Error("Invalid .flowgio file");
  }

  const file = value as Record<string, unknown>;

  if (file.format !== FLOWGIO_FORMAT) {
    throw new Error("Invalid .flowgio file format");
  }

  if (file.version !== FLOWGIO_VERSION) {
    throw new Error(`Unsupported .flowgio version: ${String(file.version)}`);
  }

  if (typeof file.title !== "string" || file.title.length > DIAGRAM_LIMITS.maxTitleLength) {
    throw new Error("Invalid .flowgio title");
  }

  if (typeof file.source !== "string" || file.source.length > DIAGRAM_LIMITS.maxSourceLength) {
    throw new Error("Invalid .flowgio source");
  }

  const result = validateDiagramDocument(file.document);

  if (!result.ok) {
    throw new Error(`Invalid .flowgio document: ${result.reason}`);
  }

  return {
    title: file.title,
    source: file.source,
    document: structuredClone(result.value),
  };
}
