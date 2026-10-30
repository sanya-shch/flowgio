<script setup lang="ts">
import { RouterLink } from "vue-router";

const features = [
  {
    title: "Visual editor",
    description: "Build and arrange diagrams directly on the canvas.",
  },
  {
    title: "Code driven",
    description: "Define diagrams using a simple, readable diagram DSL.",
  },
  {
    title: "Developer focused",
    description: "Keep diagrams close to the code and the architecture they describe.",
  },
];
</script>

<template>
  <div class="home-page">
    <section class="hero">
      <div class="hero-content">
        <span class="eyebrow"> Diagramming for developers </span>

        <h1>
          Design systems.
          <br />
          Visualize ideas.
        </h1>

        <p class="hero-description">
          Flowgio is a developer-focused diagram editor that combines code and visual editing in one
          place.
        </p>

        <div class="hero-actions">
          <RouterLink to="/editor" class="primary-button"> Open editor </RouterLink>

          <RouterLink to="/tutorials" class="secondary-button"> Explore tutorials </RouterLink>
        </div>
      </div>
    </section>

    <section class="features">
      <article v-for="feature in features" :key="feature.title" class="feature-card">
        <h2>
          {{ feature.title }}
        </h2>

        <p>
          {{ feature.description }}
        </p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  width: 100%;
}

.hero {
  display: flex;
  justify-content: center;

  padding: 120px 24px 80px;
}

.hero-content {
  width: 100%;
  max-width: 760px;

  text-align: center;
}

.eyebrow {
  display: inline-block;

  margin-bottom: 18px;

  color: var(--text-secondary);

  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

h1 {
  margin: 0;

  color: var(--accent-color);

  font-size: clamp(42px, 7vw, 72px);
  line-height: 1.02;
  letter-spacing: -0.045em;
}

.hero-description {
  max-width: 600px;

  margin: 28px auto 0;

  color: var(--text-secondary);

  font-size: 17px;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  justify-content: center;
  gap: 10px;

  margin-top: 32px;
}

.primary-button,
.secondary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;

  min-height: 40px;
  padding: 0 16px;

  border-radius: 7px;

  font-size: 13px;
  font-weight: 600;

  text-decoration: none;

  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.primary-button {
  background: var(--accent-color);
  color: white;
}

.primary-button:hover {
  opacity: 0.9;
}

.secondary-button {
  border: 1px solid var(--border-color);

  background: var(--panel-background);
  color: var(--text-primary);
}

.secondary-button:hover {
  border-color: var(--text-secondary);
}

.features {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;

  width: min(1100px, calc(100% - 48px));

  margin: 0 auto;
  padding-bottom: 80px;
}

.feature-card {
  padding: 24px;

  border: 1px solid var(--border-color);
  border-radius: 10px;

  background: var(--panel-background);
}

.feature-card h2 {
  margin: 0;

  font-size: 15px;
}

.feature-card p {
  margin: 10px 0 0;

  color: var(--text-secondary);

  font-size: 13px;
  line-height: 1.6;
}

@media (max-width: 720px) {
  .hero {
    padding-top: 80px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .features {
    grid-template-columns: 1fr;
  }
}
</style>
