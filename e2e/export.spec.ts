import { expect, test } from "@playwright/test";

import { setMonacoContent } from "./utils";

test.describe("Export", () => {
  test("exports the diagram as SVG", async ({ page }) => {
    await page.goto("/editor");

    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("button", { name: "Export SVG" }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.svg$/);
  });

  test("exports the diagram as PNG", async ({ page }) => {
    await page.goto("/editor");

    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("button", { name: "Export PNG" }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.png$/);
  });

  test("exports the diagram as a .flowgio file", async ({ page }) => {
    await page.goto("/editor");

    const downloadPromise = page.waitForEvent("download");

    await page.getByRole("button", { name: "Export", exact: true }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.flowgio$/);
  });

  test("export buttons are disabled when the diagram has a parse error", async ({ page }) => {
    await page.goto("/editor");

    await setMonacoContent(page, "not valid {{{");

    await expect(page.locator(".error-panel")).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole("button", { name: "Export SVG" })).toBeDisabled();
  });
});
