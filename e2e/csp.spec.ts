import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

import { setMonacoContent } from "./utils";

/*
 * Guards the Content-Security-Policy delivered via <meta> (see vite.config.ts).
 * Runs against the production build (`vite preview`, project "csp-production"),
 * because that is what ships: a directive that is too strict only shows up as
 * a silent runtime failure (blank editor, missing worker, broken export).
 */
async function collectViolations(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __cspViolations: string[] };

    w.__cspViolations = [];

    document.addEventListener("securitypolicyviolation", (event) => {
      w.__cspViolations.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
}

async function violations(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __cspViolations: string[] }).__cspViolations);
}

test.describe("Content-Security-Policy (production build)", () => {
  test("ships a CSP without inline scripts or eval", async ({ page }) => {
    await page.goto("/");

    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute("content");

    expect(policy).toContain("script-src 'self'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  test("editor, worker and diagram render with no CSP violations", async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await collectViolations(page);
    await page.goto("/editor");

    await expect(page.locator(".monaco-editor").first()).toBeVisible();

    await setMonacoContent(page, 'flowchart LR\n\nA["One"] -> B["Two"]');

    await expect(page.locator(".diagram-node")).toHaveCount(2);

    expect(await violations(page)).toEqual([]);
    expect(consoleErrors.filter((text) => /Content Security Policy/i.test(text))).toEqual([]);
  });

  test("embed page renders with no CSP violations", async ({ page }) => {
    await collectViolations(page);

    const source = encodeURIComponent('flowchart LR\n\nA["One"] -> B["Two"]');

    await page.goto(`/embed?source=${source}`);

    await expect(page.locator(".diagram-node")).toHaveCount(2);
    expect(await violations(page)).toEqual([]);
  });
});
