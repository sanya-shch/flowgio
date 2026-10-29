import { nextTick, onMounted, watch } from "vue";

import { readSharedDocument } from "@/features/share/shareUrl";

import { fitCanvasToScreen } from "./fitCanvasToScreen";

import type { RouteLocationNormalizedLoaded, Router } from "vue-router";
import type { useEditorStore } from "@/stores/editor";

interface DiagramLifecycleDeps {
  confirmDiscardChanges: () => boolean;
  checkForRecoveryDraft: (diagramId: string | null) => Promise<void>;
}

export function useDiagramLifecycle(
  store: ReturnType<typeof useEditorStore>,
  route: RouteLocationNormalizedLoaded,
  router: Router,
  deps: DiagramLifecycleDeps,
) {
  watch(
    () => store.diagramId,
    (id) => {
      if (!id || route.query.id === id) {
        return;
      }

      void router.replace({
        query: {
          ...route.query,
          id,
        },
      });
    },
  );

  onMounted(async () => {
    const shared = readSharedDocument();

    if (shared.status === "error") {
      window.alert(`This share link could not be opened: ${shared.message}`);
    }

    const sharedDocument = shared.status === "ok" ? shared.document : null;

    const id = route.query.id;
    const source = route.query.source;

    if (sharedDocument) {
      store.loadDocument(sharedDocument, "Shared Diagram");
    } else if (typeof id === "string") {
      await store.loadDiagram(id);
    } else if (typeof source === "string") {
      store.setSource(source);
      store.parse();
    } else {
      store.createNewDiagram();
    }

    if (!sharedDocument && typeof source !== "string") {
      const recoveryDiagramId = typeof id === "string" ? id : null;

      await deps.checkForRecoveryDraft(recoveryDiagramId);
    }

    await nextTick();

    fitCanvasToScreen(store);
  });

  async function handleCreateNewDiagram() {
    if (!deps.confirmDiscardChanges()) {
      return;
    }

    await router.replace({
      path: "/editor",
    });

    store.createNewDiagram();
  }

  return {
    handleCreateNewDiagram,
  };
}
