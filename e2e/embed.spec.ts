import { expect, test } from "@playwright/test";

test.describe("Embed mode", () => {
  test("renders a read-only diagram from ?source= with no editor chrome", async ({ page }) => {
    const source = encodeURIComponent('flowchart LR\n\nA["One"] -> B["Two"]');

    await page.goto(`/embed?source=${source}`);

    await expect(page.locator(".diagram-node")).toHaveCount(2);
    await expect(page.locator(".editor-header")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Edit on Flowgio" })).toBeVisible();
  });

  test("dragging a node has no effect in embed mode", async ({ page }) => {
    const source = encodeURIComponent('flowchart LR\n\nA["One"] -> B["Two"]');

    await page.goto(`/embed?source=${source}`);

    const node = page.locator(".diagram-node").first();

    const before = await node.boundingBox();

    if (!before) {
      throw new Error("Expected node bounding box");
    }

    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + 120, before.y + 120, { steps: 5 });
    await page.mouse.up();

    const after = await node.boundingBox();

    if (!after) {
      throw new Error("Expected node bounding box");
    }

    expect(Math.round(after.x)).toBe(Math.round(before.x));
    expect(Math.round(after.y)).toBe(Math.round(before.y));
  });

  test("renders nothing but stays functional with no source given", async ({ page }) => {
    await page.goto("/embed");

    await expect(page.locator(".diagram-node")).toHaveCount(0);
    await expect(page.locator(".diagram-canvas")).toBeVisible();
  });
});
