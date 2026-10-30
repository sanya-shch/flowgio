import { DIAGRAM_LIMITS } from "@/features/diagram/limits";

/*
 * Checks the size before reading, so an oversized file is rejected without
 * loading it into memory.
 */
export function readFlowgioFile(file: File): Promise<string> {
  if (file.size > DIAGRAM_LIMITS.maxFileBytes) {
    return Promise.reject(new Error("Invalid .flowgio file: file is too large"));
  }

  return file.text();
}
