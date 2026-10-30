import { computed, ref } from "vue";

import { History } from "@/features/diagram/history";

import type { DiagramDocument } from "@/features/diagram/types";

const HISTORY_LIMIT = 100;

/*
 * Memory budget for undo + redo snapshots, in approximate bytes of serialised
 * document. Each undo step is a full copy of the document, so without this a
 * large diagram would keep 100 copies. At the input limits (3,000 nodes /
 * 6,000 edges, ~1.2 MB per snapshot) about 10 steps are kept; a diagram of
 * a few dozen nodes still gets the full 100.
 */
export const HISTORY_MAX_WEIGHT = 12_000_000;

const BYTES_PER_NODE = 220; // node + layout rect + sourceMap entry
const BYTES_PER_EDGE = 90;

export function estimateDocumentWeight(document: DiagramDocument): number {
  return 200 + document.nodes.length * BYTES_PER_NODE + document.edges.length * BYTES_PER_EDGE;
}

export function useHistoryController() {
  const history = new History<DiagramDocument>(HISTORY_LIMIT, {
    maxWeight: HISTORY_MAX_WEIGHT,
    weigh: estimateDocumentWeight,
  });

  const version = ref(0);

  function notifyChange() {
    version.value += 1;
  }

  const canUndo = computed(() => {
    void version.value;

    return history.canUndo;
  });

  const canRedo = computed(() => {
    void version.value;

    return history.canRedo;
  });

  function push(previousDocument: DiagramDocument) {
    history.push(previousDocument);
    notifyChange();
  }

  function undo(currentDocument: DiagramDocument): DiagramDocument | null {
    const previousDocument = history.undo(currentDocument);

    if (previousDocument) {
      notifyChange();
    }

    return previousDocument;
  }

  function redo(currentDocument: DiagramDocument): DiagramDocument | null {
    const nextDocument = history.redo(currentDocument);

    if (nextDocument) {
      notifyChange();
    }

    return nextDocument;
  }

  function clear() {
    history.clear();
    notifyChange();
  }

  return {
    canUndo,
    canRedo,
    push,
    undo,
    redo,
    clear,
  };
}

export type HistoryController = ReturnType<typeof useHistoryController>;
