<script setup lang="ts">
import type { DiagramDraft } from "@/features/drafts/types";

defineProps<{
  draft: DiagramDraft;
}>();

const emit = defineEmits<{
  recover: [];
  discard: [];
}>();

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}
</script>

<template>
  <Teleport to="body">
    <div class="draft-recovery-backdrop" role="presentation">
      <section
        class="draft-recovery-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="draft-recovery-title"
        aria-describedby="draft-recovery-description"
      >
        <div class="draft-recovery-dialog__icon">↻</div>

        <div class="draft-recovery-dialog__content">
          <h2 id="draft-recovery-title">Recover unsaved changes?</h2>

          <p id="draft-recovery-description">
            Flowgio found an unsaved draft of
            <strong>{{ draft.title }}</strong
            >.
          </p>

          <p class="draft-recovery-dialog__meta">Last updated {{ formatDate(draft.updatedAt) }}</p>
        </div>

        <div class="draft-recovery-dialog__actions">
          <button
            type="button"
            class="draft-recovery-dialog__button draft-recovery-dialog__button--secondary"
            @click="emit('discard')"
          >
            Discard
          </button>

          <button
            type="button"
            class="draft-recovery-dialog__button draft-recovery-dialog__button--primary"
            autofocus
            @click="emit('recover')"
          >
            Recover
          </button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.draft-recovery-backdrop {
  position: fixed;
  inset: 0;

  z-index: 1000;

  display: grid;
  place-items: center;

  padding: 24px;

  background: rgb(0 0 0 / 45%);
  backdrop-filter: blur(4px);
}

.draft-recovery-dialog {
  width: min(440px, 100%);

  padding: 24px;

  border: 1px solid var(--border-color);
  border-radius: 14px;

  background: var(--panel-background);
  color: var(--text-primary);

  box-shadow: var(--panel-shadow);
}

.draft-recovery-dialog__icon {
  display: grid;
  place-items: center;

  width: 40px;
  height: 40px;

  margin-bottom: 16px;

  border-radius: 10px;

  background: var(--hover-background);

  font-size: 20px;
}

.draft-recovery-dialog__content h2 {
  margin: 0 0 10px;

  font-size: 18px;
}

.draft-recovery-dialog__content p {
  margin: 0;

  color: var(--text-secondary);

  line-height: 1.5;
}

.draft-recovery-dialog__meta {
  margin-top: 8px !important;

  font-size: 12px;
}

.draft-recovery-dialog__actions {
  display: flex;
  justify-content: flex-end;

  gap: 8px;

  margin-top: 24px;
}

.draft-recovery-dialog__button {
  height: 34px;

  padding: 0 14px;

  border: 1px solid var(--border-color);
  border-radius: 7px;

  font: inherit;
  font-size: 12px;
  font-weight: 500;

  cursor: pointer;
}

.draft-recovery-dialog__button--secondary {
  background: transparent;
  color: var(--text-secondary);
}

.draft-recovery-dialog__button--secondary:hover {
  background: var(--hover-background);
  color: var(--text-primary);
}

.draft-recovery-dialog__button--primary {
  border-color: var(--accent-color);

  background: var(--accent-color);
  color: white;
}

.draft-recovery-dialog__button--primary:hover {
  filter: brightness(1.05);
}
</style>
