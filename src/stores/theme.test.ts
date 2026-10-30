import { beforeEach, describe, expect, it } from "vitest";

import { createPinia, setActivePinia } from "pinia";

import { useThemeStore } from "./theme";

describe("theme store", () => {
  beforeEach(() => {
    localStorage.clear();

    document.documentElement.removeAttribute("data-theme");

    setActivePinia(createPinia());
  });

  it("uses dark theme by default", () => {
    const store = useThemeStore();

    expect(store.theme).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("changes theme", () => {
    const store = useThemeStore();

    store.setTheme("light");

    expect(store.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("persists theme in localStorage", () => {
    const store = useThemeStore();

    store.setTheme("midnight");

    expect(localStorage.getItem("flowgio-theme")).toBe("midnight");
  });

  it("restores theme from localStorage", () => {
    localStorage.setItem("flowgio-theme", "light");

    const store = useThemeStore();

    expect(store.theme).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("ignores invalid stored theme", () => {
    localStorage.setItem("flowgio-theme", "invalid");

    const store = useThemeStore();

    expect(store.theme).toBe("dark");
  });
});
