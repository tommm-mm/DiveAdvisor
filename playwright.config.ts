import { defineConfig, devices } from "@playwright/test";

// Runs against a production build; needs .env.local with the Supabase URL and anon key.
export default defineConfig({
  testDir: "tests",
  use: {
    baseURL: "http://localhost:3100",
    // Optional: point to a preinstalled Chromium (e.g. cloud sandboxes) instead of downloading one.
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: { command: "npm run start -- -p 3100", url: "http://localhost:3100", reuseExistingServer: true },
});
