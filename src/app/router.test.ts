import { describe, expect, it } from "vitest";

import { router } from "./router";

describe("router", () => {
  it("falls back to the not-found page for an unknown path", async () => {
    await router.push("/this-route-does-not-exist");
    await router.isReady();

    expect(router.currentRoute.value.matched.length).toBeGreaterThan(0);
    expect(document.title).toBe("Page not found · Flowgio");
  });

  it("resolves /embed to a dedicated route (no AppShell chrome)", async () => {
    await router.push("/embed?source=flowchart+LR");
    await router.isReady();

    expect(router.currentRoute.value.matched).toHaveLength(1);
    expect(document.title).toBe("Embed · Flowgio");
  });

  it("sets a route-specific document title", async () => {
    await router.push("/tutorials");
    await router.isReady();

    expect(document.title).toBe("Tutorials · Flowgio");
  });

  it("sets a plain app-name title for the home route", async () => {
    await router.push("/");
    await router.isReady();

    expect(document.title).toBe("Flowgio");
  });
});
