<script setup lang="ts">
import { RouterLink } from "vue-router";

import ThemeSwitcher from "@/components/theme/ThemeSwitcher.vue";
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand">
        <span class="brand-mark"> ◆ </span>

        <span class="brand-name"> Flowgio </span>
      </RouterLink>

      <div class="header-actions">
        <nav class="navigation">
          <RouterLink to="/editor" class="nav-link"> Editor </RouterLink>

          <RouterLink to="/diagrams" class="nav-link"> Diagrams </RouterLink>

          <RouterLink to="/tutorials" class="nav-link"> Tutorials </RouterLink>
        </nav>

        <ThemeSwitcher />
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: relative;
  z-index: 10;

  width: 100%;

  border-bottom: 1px solid var(--border-color);
  background: var(--app-background);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;

  width: 100%;
  height: 56px;

  padding: 0 24px;
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

.navigation {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  padding: 7px 10px;

  border-radius: 6px;

  color: var(--text-secondary);
  text-decoration: none;

  font-size: 13px;
  font-weight: 500;

  transition:
    background-color 120ms ease,
    color 120ms ease;
}

.nav-link:hover {
  background: var(--panel-background);
  color: var(--text-primary);
}

.nav-link.router-link-active {
  background: var(--panel-background);
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

@media (max-width: 720px) {
  .header-actions {
    gap: 12px;
  }

  .navigation {
    display: none;
  }
}
</style>
