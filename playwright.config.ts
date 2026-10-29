import { defineConfig, devices } from "@playwright/test";

const PORT = 5173;
const PREVIEW_PORT = 4173;

export default defineConfig({
  testDir: "./e2e",

  fullyParallel: true,

  forbidOnly: Boolean(process.env.CI),

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",

  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      testIgnore: /csp\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "csp-production",
      testMatch: /csp\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${PREVIEW_PORT}` },
    },
  ],

  webServer: [
    {
      command: "npm run dev -- --port 5173 --strictPort",
      url: `http://localhost:${PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      /* Production build served as-is; GITHUB_REPOSITORY is cleared so the base stays "/". */
      command: `npm run build && npm run preview -- --port ${PREVIEW_PORT} --strictPort`,
      url: `http://localhost:${PREVIEW_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { GITHUB_REPOSITORY: "" },
    },
  ],
});
