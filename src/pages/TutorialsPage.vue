<script setup lang="ts">
import { tutorials } from "@/features/tutorials/tutorialRegistry";
</script>

<template>
  <section class="tutorials-page">
    <div class="tutorials-container">
      <header class="tutorials-header">
        <p class="eyebrow">Learn Flowgio</p>

        <h1>Tutorials</h1>

        <p class="subtitle">
          Learn diagramming concepts and open every example directly in the editor.
        </p>
      </header>

      <div class="tutorials-grid">
        <article v-for="tutorial in tutorials" :key="tutorial.slug" class="tutorial-card">
          <div class="tutorial-card-content">
            <h2>
              {{ tutorial.title }}
            </h2>

            <p>
              {{ tutorial.description }}
            </p>
          </div>

          <RouterLink
            :to="{
              path: '/editor',
              query: {
                source: tutorial.source,
              },
            }"
            class="tutorial-link"
          >
            Open in editor →
          </RouterLink>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.tutorials-page {
  min-height: 100%;
  padding: 72px 24px;
}

.tutorials-container {
  width: min(1100px, 100%);
  margin: 0 auto;
}

.tutorials-header {
  max-width: 720px;
  margin-bottom: 48px;
}

.eyebrow {
  margin: 0 0 12px;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

h1 {
  margin: 0 0 16px;
  font-size: 48px;
  line-height: 1.1;
  color: var(--accent-color);
}

.subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 18px;
  line-height: 1.6;
}

.tutorials-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 24px;
}

.tutorial-card {
  display: flex;
  flex-direction: column;
  min-height: 240px;
  padding: 24px;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--surface);
}

.tutorial-card-content {
  flex: 1;
}

h2 {
  margin: 0 0 12px;
  font-size: 20px;
}

.tutorial-card p {
  margin: 0;
  color: var(--text-secondary);
  line-height: 1.6;
}

.tutorial-link {
  align-self: flex-start;
  margin-top: 24px;
  color: var(--text-primary);
  font-weight: 600;
  text-decoration: none;
}

.tutorial-link:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .tutorials-grid {
    grid-template-columns: 1fr;
  }
}
</style>
