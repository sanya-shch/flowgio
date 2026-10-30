import { expect, test } from "@playwright/test";

test.describe("404 page", () => {
  test("shows the not-found page for an unknown route", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page).toHaveTitle("Page not found · Flowgio");
  });

  test("Go home navigates to the homepage", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    await page.getByRole("link", { name: "Go home" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page).toHaveTitle("Flowgio");
  });

  test("Open editor navigates to the editor", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");

    await page.getByRole("link", { name: "Open editor" }).click();

    await expect(page).toHaveURL(/\/editor/);
  });
});
