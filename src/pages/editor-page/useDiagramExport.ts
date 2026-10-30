import { onBeforeUnmount, ref } from "vue";

import { exportDiagramToSvg } from "@/features/diagram/svgExporter";
import { downloadSvg } from "@/features/diagram/svgDownload";
import { downloadPng } from "@/features/diagram/pngDownload";
import { createShareUrl } from "@/features/share/shareUrl";
import {
  createFlowgioFile,
  parseFlowgioFile,
  serializeFlowgioFile,
} from "@/features/file/flowgioFile";
import { downloadFlowgioFile } from "@/features/file/flowgioFileDownload";
import { readFlowgioFile } from "@/features/file/flowgioFileImport";

import type { useEditorStore } from "@/stores/editor";
import type { useThemeStore } from "@/stores/theme";

const SHARE_COPIED_DURATION = 2000;

interface DiagramExportDeps {
  confirmDiscardChanges: () => boolean;
}

function sanitizeFilename(value: string): string {
  return (
    value
      .trim()
      .replace(/[<>:"/\\|?*]+/g, "-")
      .replace(/\s+/g, "-") || "diagram"
  );
}

/**
 * Export/import/share for the current diagram: SVG and PNG raster
 * export, the native .flowgio file format (round-trippable), and
 * copying a share URL to the clipboard.
 */
export function useDiagramExport(
  store: ReturnType<typeof useEditorStore>,
  themeStore: ReturnType<typeof useThemeStore>,
  deps: DiagramExportDeps,
) {
  function handleExportFlowgio() {
    if (store.hasErrors || !store.document.nodes.length) {
      return;
    }

    const file = createFlowgioFile(store.diagramTitle, store.source, store.document);

    const content = serializeFlowgioFile(file);

    downloadFlowgioFile(content, `${sanitizeFilename(store.diagramTitle)}.flowgio`);
  }

  async function handleImportFlowgio() {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".flowgio,application/json";

    const file = await new Promise<File | null>((resolve) => {
      input.onchange = () => {
        resolve(input.files?.[0] ?? null);
      };

      input.click();
    });

    if (!file) {
      return;
    }

    try {
      const content = await readFlowgioFile(file);
      const imported = parseFlowgioFile(content);

      if (!deps.confirmDiscardChanges()) {
        return;
      }

      store.loadDocument(imported.document, imported.title, imported.source);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to import .flowgio file";

      window.alert(message);
    }
  }

  function handleExportSvg() {
    if (store.hasErrors || !store.document.nodes.length) {
      return;
    }

    const svg = exportDiagramToSvg(store.document, themeStore.theme);

    downloadSvg(svg, `${sanitizeFilename(store.diagramTitle)}.svg`);
  }

  async function handleExportPng() {
    if (store.hasErrors || !store.document.nodes.length) {
      return;
    }

    const svg = exportDiagramToSvg(store.document, themeStore.theme);

    await downloadPng(svg, `${sanitizeFilename(store.diagramTitle)}.png`, {
      scale: 2,
    });
  }

  const isShareCopied = ref(false);

  let shareCopiedTimeout: ReturnType<typeof setTimeout> | null = null;

  async function handleShare() {
    if (store.hasErrors || !store.document.nodes.length) {
      return;
    }

    const url = createShareUrl(store.document);

    try {
      await navigator.clipboard.writeText(url);

      isShareCopied.value = true;

      if (shareCopiedTimeout !== null) {
        clearTimeout(shareCopiedTimeout);
      }

      shareCopiedTimeout = setTimeout(() => {
        isShareCopied.value = false;
      }, SHARE_COPIED_DURATION);
    } catch {
      isShareCopied.value = false;
    }
  }

  onBeforeUnmount(() => {
    if (shareCopiedTimeout !== null) {
      clearTimeout(shareCopiedTimeout);
    }
  });

  return {
    isShareCopied,
    handleExportSvg,
    handleExportPng,
    handleExportFlowgio,
    handleImportFlowgio,
    handleShare,
  };
}
