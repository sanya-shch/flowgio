import { expect, test } from "@playwright/test";

import { setMonacoContent } from "./utils";

test.describe("Editor basics", () => {
  test("loads the editor with a default two-node diagram", async ({ page }) => {
    await page.goto("/editor");

    await expect(page.locator(".diagram-node")).toHaveCount(2);
    await expect(page.locator(".error-panel")).toHaveCount(0);
  });

  test("shows a parse error and keeps the last valid diagram on the canvas", async ({ page }) => {
    await page.goto("/editor");

    await setMonacoContent(page, "this is not valid flowgio syntax {{{");

    await expect(page.locator(".error-panel")).toBeVisible({ timeout: 5000 });

    // the default 2-node diagram from before the edit should still be rendered
    await expect(page.locator(".diagram-node")).toHaveCount(2);
  });
});
