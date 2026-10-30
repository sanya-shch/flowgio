<script setup lang="ts">
import { useRoute, useRouter } from "vue-router";

import { useEditorStore } from "@/stores/editor";
import { useThemeStore } from "@/stores/theme";
import CodeEditor from "@/components/editor/CodeEditor.vue";
import DiagramCanvas from "@/components/canvas/DiagramCanvas.vue";
import NodeInspector from "@/components/canvas/NodeInspector.vue";
import ThemeSwitcher from "@/components/theme/ThemeSwitcher.vue";
import DraftRecoveryDialog from "@/features/drafts/components/DraftRecoveryDialog.vue";

import { fitCanvasToScreen } from "./editor-page/fitCanvasToScreen";
import { useDiagramAutoParse } from "./editor-page/useDiagramAutoParse";
import { useEditorShortcuts } from "./editor-page/useEditorShortcuts";
import { useUnsavedChangesGuard } from "./editor-page/useUnsavedChangesGuard";
import { useDiagramExport } from "./editor-page/useDiagramExport";
import { useDraftRecovery } from "./editor-page/useDraftRecovery";
import { useDiagramTitleEditing } from "./editor-page/useDiagramTitleEditing";
import { useDiagramLifecycle } from "./editor-page/useDiagramLifecycle";
import ShortcutsHelpDialog from "./editor-page/ShortcutsHelpDialog.vue";

const store = useEditorStore();
const themeStore = useThemeStore();

const route = useRoute();
const router = useRouter();

const { cancelScheduledParse } = useDiagramAutoParse(store);

const { isHelpOpen, openHelp, closeHelp } = useEditorShortcuts(store, { cancelScheduledParse });

const { confirmDiscardChanges } = useUnsavedChangesGuard(store);

const {
  isShareCopied,
  handleExportSvg,
  handleExportPng,
  handleExportFlowgio,
  handleImportFlowgio,
  handleShare,
} = useDiagramExport(store, themeStore, { confirmDiscardChanges });

const { recoveryDraft, checkForRecoveryDraft, handleRecoverDraft, handleDiscardDraft } =
  useDraftRecovery(store, { onRecovered: () => fitCanvasToScreen(store) });

const { isEditingTitle, editingTitle, startEditingTitle, finishEditingTitle } =
  useDiagramTitleEditing(store);

const { handleCreateNewDiagram } = useDiagramLifecycle(store, route, router, {
  confirmDiscardChanges,
  checkForRecoveryDraft,
});

function clearShareHash() {
  if (!window.location.hash.startsWith("#share=")) {
    return;
  }

  const url = new URL(window.location.href);

  url.hash = "";

  window.history.replaceState(window.history.state, "", url.toString());
}

async function handleSave() {
  await store.saveDiagram();
  clearShareHash();
}
</script>

<template>
  <DraftRecoveryDialog
    v-if="recoveryDraft"
    :draft="recoveryDraft"
    @recover="handleRecoverDraft"
    @discard="handleDiscardDraft"
  />

  <ShortcutsHelpDialog v-if="isHelpOpen" @close="closeHelp" />

  <div class="editor-page">
    <header class="editor-header">
      <div class="editor-header-left">
        <RouterLink to="/" class="brand">
          <span class="brand-mark" aria-hidden="true"> ◆ </span>

          <span class="brand-name"> Flowgio </span>
        </RouterLink>

        <div class="diagram-title">
          <input
            v-if="isEditingTitle"
            v-model="editingTitle"
            class="diagram-title-input"
            type="text"
            maxlength="100"
            @keydown.enter="finishEditingTitle"
            @keydown.escape="isEditingTitle = false"
            @blur="finishEditingTitle"
          />

          <button
            v-else
            type="button"
            class="diagram-title-button"
            title="Rename diagram"
            @click="startEditingTitle"
          >
            <span class="diagram-title-text">
              {{ store.diagramTitle }}
            </span>
          </button>
        </div>
      </div>

      <div class="editor-actions">
        <button
          type="button"
          class="header-button"
          :disabled="!store.canUndo"
          title="Undo (Cmd/Ctrl + Z)"
          @click="store.undo"
        >
          Undo
        </button>

        <button
          type="button"
          class="header-button"
          :disabled="!store.canRedo"
          title="Redo (Cmd/Ctrl + Shift + Z)"
          @click="store.redo"
        >
          Redo
        </button>

        <div class="save-status" role="status" aria-live="polite">
          <span v-if="store.autosaveError" class="save-status__error">
            {{ store.autosaveError }}
          </span>

          <span v-else-if="store.isSaving" class="save-status__saving"> Saving... </span>

          <span v-else-if="store.isDirty" class="save-status__dirty"> Unsaved changes </span>

          <span v-else-if="store.lastSavedAt" class="save-status__saved"> Saved </span>
        </div>

        <button
          type="button"
          class="header-button"
          :disabled="store.isSaving || !store.isDirty"
          @click="handleSave"
        >
          Save
        </button>

        <button
          type="button"
          class="header-button"
          :disabled="store.hasErrors || !store.document.nodes.length"
          @click="handleShare"
        >
          {{ isShareCopied ? "Copied!" : "Share" }}
        </button>

        <button
          type="button"
          class="header-button"
          :disabled="store.hasErrors || !store.document.nodes.length"
          title="Export diagram as SVG"
          @click="handleExportSvg"
        >
          Export SVG
        </button>

        <button
          type="button"
          class="header-button"
          :disabled="store.hasErrors || !store.document.nodes.length"
          title="Export diagram as PNG"
          @click="handleExportPng"
        >
          Export PNG
        </button>

        <button
          type="button"
          class="header-button"
          :disabled="store.hasErrors || !store.document.nodes.length"
          @click="handleExportFlowgio"
        >
          Export
        </button>

        <button type="button" class="header-button" @click="handleImportFlowgio">Import</button>

        <button type="button" class="header-button" @click="handleCreateNewDiagram">New</button>

        <button
          type="button"
          class="header-button"
          title="Parse diagram (Cmd/Ctrl + Enter)"
          @click="store.parse"
        >
          Parse
        </button>

        <button
          type="button"
          class="header-button"
          title="Reset viewport (Cmd/Ctrl + 0)"
          @click="store.resetViewport"
        >
          Reset view
        </button>

        <button
          type="button"
          class="header-button"
          title="Keyboard shortcuts (?)"
          aria-label="Show keyboard shortcuts"
          @click="openHelp"
        >
          Shortcuts
        </button>

        <ThemeSwitcher />
      </div>
    </header>

    <main class="editor-layout" aria-label="Diagram editor">
      <!-- Code -->
      <section class="panel code-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-indicator code-indicator" />

            <span> Code </span>
          </div>

          <span class="panel-hint"> Cmd/Ctrl + Enter to parse </span>
        </div>

        <div class="panel-content">
          <CodeEditor v-model="store.source" />
        </div>
      </section>

      <!-- Canvas -->
      <section class="panel canvas-panel">
        <div class="panel-header">
          <div class="panel-title">
            <span class="panel-indicator canvas-indicator" />

            <span> Visual Editor </span>
          </div>

          <span v-if="store.hasErrors" class="status error">
            {{ store.errors.length }}
            {{ store.errors.length === 1 ? "error" : "errors" }}
          </span>

          <span v-else class="status success"> Valid </span>
        </div>

        <div class="panel-content">
          <DiagramCanvas />
        </div>
      </section>

      <!-- Inspector -->
      <section class="panel inspector-panel">
        <NodeInspector />
      </section>
    </main>

    <footer class="editor-footer">
      <div class="footer-left">
        <span>
          {{ store.document.nodes.length }}
          {{ store.document.nodes.length === 1 ? "node" : "nodes" }}
        </span>

        <span class="footer-separator"> • </span>

        <span>
          {{ store.document.edges.length }}
          {{ store.document.edges.length === 1 ? "edge" : "edges" }}
        </span>
      </div>

      <div class="footer-right">
        <span> {{ Math.round(store.zoom * 100) }}% </span>

        <span class="footer-separator"> • </span>

        <span>
          {{ store.document.direction }}
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.editor-page {
  display: flex;
  flex-direction: column;

  width: 100%;
  height: 100vh;

  min-width: 0;
  min-height: 0;

  overflow: hidden;

  background: var(--app-background);
  color: var(--text-primary);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  flex-shrink: 0;

  height: 56px;

  padding: 0 16px;

  border-bottom: 1px solid var(--border-color);

  background: var(--panel-background);
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;

  color: var(--text-primary);
  text-decoration: none;
}

.brand-mark {
  display: grid;
  place-items: center;

  width: 28px;
  height: 28px;

  border-radius: 7px;

  background: var(--accent-color);
  color: white;

  font-size: 14px;
  font-weight: 700;
}

.brand-name {
  font-size: 15px;
  font-weight: 650;
  letter-spacing: -0.01em;
}

.editor-header-left {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 20px;
}

.diagram-title {
  min-width: 0;
}

.diagram-title-button {
  display: inline-flex;
  align-items: center;
  gap: 7px;

  max-width: 280px;
  padding: 5px 7px;

  border: 0;
  border-radius: 6px;

  background: transparent;
  color: var(--text-primary);

  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.diagram-title-button:hover {
  background: var(--hover-background);
}

.diagram-title-text {
  overflow: hidden;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.diagram-title-input {
  width: 280px;
  height: 32px;

  padding: 0 9px;

  border: 1px solid var(--accent-color);
  border-radius: 6px;

  outline: none;

  background: var(--panel-background);
  color: var(--text-primary);

  font: inherit;
  font-size: 13px;
}

.editor-actions {
  display: flex;
  align-items: center;

  gap: 6px;
}

.header-button {
  height: 32px;

  padding: 0 10px;

  border: 1px solid var(--border-color);
  border-radius: 6px;

  background: transparent;
  color: var(--text-secondary);

  cursor: pointer;

  font: inherit;
  font-size: 11px;
  font-weight: 500;
}

.header-button:hover {
  background: var(--hover-background);
  color: var(--text-primary);
}

.editor-layout {
  display: grid;

  grid-template-columns:
    minmax(280px, 1fr)
    minmax(400px, 2fr)
    280px;

  flex: 1;

  min-width: 0;
  min-height: 0;

  overflow: hidden;
}

.panel {
  display: flex;
  flex-direction: column;

  min-width: 0;
  min-height: 0;

  background: var(--panel-background);
}

.panel + .panel {
  border-left: 1px solid var(--border-color);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  flex-shrink: 0;

  height: 38px;

  padding: 0 12px;

  border-bottom: 1px solid var(--border-color);

  background: var(--panel-background);
}

.panel-title {
  display: flex;
  align-items: center;

  gap: 7px;

  font-size: 11px;
  font-weight: 600;
}

.panel-indicator {
  width: 6px;
  height: 6px;

  border-radius: 50%;
}

.code-indicator {
  background: var(--accent-color);
}

.canvas-indicator {
  background: var(--success-color);
}

.panel-hint {
  color: var(--text-secondary);

  font-size: 9px;
}

.panel-content {
  flex: 1;

  min-width: 0;
  min-height: 0;

  overflow: hidden;
}

.code-panel .panel-content {
  display: flex;
}

.code-panel :deep(.code-editor) {
  flex: 1;

  min-width: 0;
  min-height: 0;
}

.canvas-panel .panel-content {
  position: relative;
}

.inspector-panel {
  min-width: 280px;
}

.status {
  font-size: 10px;
  font-weight: 500;
}

.status.success {
  color: var(--success-color);
}

.status.error {
  color: var(--error-color);
}

.editor-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;

  flex-shrink: 0;

  height: 28px;

  padding: 0 12px;

  border-top: 1px solid var(--border-color);

  background: var(--panel-background);

  color: var(--text-secondary);

  font-size: 10px;
}

.footer-left,
.footer-right {
  display: flex;
  align-items: center;

  gap: 7px;
}

.footer-separator {
  opacity: 0.5;
}

.header-button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.save-status {
  display: inline-flex;
  align-items: center;
  min-width: 110px;

  color: var(--text-secondary);

  font-size: 12px;
  white-space: nowrap;
}

.save-status__saving {
  color: var(--text-secondary);
}

.save-status__dirty {
  color: var(--text-secondary);
}

.save-status__saved {
  color: var(--success-color);
}

.save-status__error {
  color: var(--error-color);
}

@media (max-width: 1100px) {
  .editor-layout {
    grid-template-columns:
      minmax(240px, 1fr)
      minmax(360px, 1.5fr)
      260px;
  }

  .inspector-panel {
    display: flex;
  }

  .inspector-panel :deep(.node-inspector) {
    width: 260px;
    min-width: 260px;
  }
}

@media (max-width: 720px) {
  .editor-layout {
    grid-template-columns: 1fr;
    grid-template-rows: 45% 55%;
  }

  .code-panel {
    border-bottom: 1px solid var(--border-color);
  }

  .canvas-panel {
    border-left: 0;
  }

  .panel + .panel {
    border-left: 0;
  }

  .panel-hint {
    display: none;
  }

  .inspector-panel {
    display: none;
  }

  .editor-header-left {
    gap: 10px;
  }

  .diagram-title-button {
    max-width: 140px;
  }

  .diagram-title-input {
    width: 140px;
  }
}
</style>
