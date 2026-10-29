import type { DiagramDocument } from "@/features/diagram/types";

import { decodeSharePayload, encodeSharePayload } from "./shareCodec";

const SHARE_PARAM = "share";

export function createShareUrl(document: DiagramDocument): string {
  const payload = encodeSharePayload(document);

  const url = new URL(window.location.href);

  url.hash = `${SHARE_PARAM}=${payload}`;

  return url.toString();
}

export function getSharePayloadFromUrl(): string | null {
  const hash = window.location.hash;

  if (!hash.startsWith(`#${SHARE_PARAM}=`)) {
    return null;
  }

  return hash.slice(`#${SHARE_PARAM}=`.length);
}

export function getSharedDocument(): DiagramDocument | null {
  const payload = getSharePayloadFromUrl();

  if (!payload) {
    return null;
  }

  return decodeSharePayload(payload);
}

export type SharedDocumentResult =
  | { status: "none" }
  | { status: "ok"; document: DiagramDocument }
  | { status: "error"; message: string };

/*
 * Never throws: a broken or hostile link must degrade into a readable error,
 * not an unhandled rejection that leaves the page blank.
 */
export function readSharedDocument(): SharedDocumentResult {
  try {
    const document = getSharedDocument();

    return document ? { status: "ok", document } : { status: "none" };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "The share link could not be opened",
    };
  }
}
