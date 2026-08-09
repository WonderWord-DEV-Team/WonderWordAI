import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${port}`;
const crossBrowser = process.env.WONDERWORD_CROSS_BROWSER === "1";
const smokeTestMatch = [
  /e2e\/smoke\/.*\.spec\.ts/,
  /e2e\/responsive\/.*\.spec\.ts/
];

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["dot"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      WONDERWORD_E2E: "1",
      WONDERWORD_E2E_AUTH_SECRET: "local-e2e-only",
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      ANTHROPIC_API_KEY: "",
      OPENAI_API_KEY: "",
      STRIPE_SECRET_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1"
    }
  },
  projects: crossBrowser
    ? [
        {
          name: "chromium-desktop-1440",
          testMatch: smokeTestMatch,
          use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }
        },
        {
          name: "chromium-laptop-1280",
          testMatch: smokeTestMatch,
          use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } }
        },
        {
          name: "chromium-android-390",
          testMatch: smokeTestMatch,
          use: { ...devices["Pixel 7"], viewport: { width: 390, height: 844 } }
        },
        {
          name: "chromium-small-iphone-375",
          testMatch: smokeTestMatch,
          use: { ...devices["iPhone SE"], viewport: { width: 375, height: 667 } }
        },
        {
          name: "chromium-tablet-768",
          testMatch: smokeTestMatch,
          use: { ...devices["iPad (gen 7)"], viewport: { width: 768, height: 1024 } }
        },
        {
          name: "webkit-desktop-1440",
          testMatch: smokeTestMatch,
          use: { ...devices["Desktop Safari"], viewport: { width: 1440, height: 900 } }
        },
        {
          name: "webkit-iphone-390",
          testMatch: smokeTestMatch,
          use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } }
        }
      ]
    : [
        {
          name: "chromium",
          use: { ...devices["Desktop Chrome"] }
        }
      ],
  outputDir: "test-results"
});
