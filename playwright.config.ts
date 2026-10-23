import { defineConfig, devices } from "@playwright/test";
import { loadEnvConfig } from "@next/env";

// Load .env.local so tests can sign in test users (E2E_PASSWORD) with the Supabase anon key.
loadEnvConfig(process.cwd());

// By default runs against a local production build. Set E2E_BASE_URL to test a deployed preview instead
// (plus VERCEL_BYPASS_SECRET if the deployment is protected).
const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "tests",
  use: {
    baseURL: remote ?? "http://localhost:3100",
    extraHTTPHeaders: process.env.VERCEL_BYPASS_SECRET
      ? { "x-vercel-protection-bypass": process.env.VERCEL_BYPASS_SECRET, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
    // Optional: point to a preinstalled Chromium (e.g. cloud sandboxes) instead of downloading one.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: remote ? undefined : { command: "npm run start -- -p 3100", url: "http://localhost:3100", reuseExistingServer: true },
});
