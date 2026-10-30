import { defineStore } from "pinia";
import { ref } from "vue";

export type Theme = "dark" | "light" | "midnight";

const STORAGE_KEY = "flowgio-theme";
const DEFAULT_THEME: Theme = "dark";

function isTheme(value: string | null): value is Theme {
  return value === "dark" || value === "light" || value === "midnight";
}

function getInitialTheme(): Theme {
  const storedTheme = localStorage.getItem(STORAGE_KEY);

  return isTheme(storedTheme) ? storedTheme : DEFAULT_THEME;
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

export const useThemeStore = defineStore("theme", () => {
  const theme = ref<Theme>(getInitialTheme());

  applyTheme(theme.value);

  function setTheme(nextTheme: Theme) {
    theme.value = nextTheme;

    applyTheme(nextTheme);

    localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  return {
    theme,
    setTheme,
  };
});
