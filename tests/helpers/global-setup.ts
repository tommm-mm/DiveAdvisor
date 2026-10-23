import { chromium, type FullConfig } from "@playwright/test";

// For protected Vercel previews: open the temporary share link once and save its access cookie,
// which every test then reuses (see storageState in playwright.config.ts).
export default async function globalSetup(config: FullConfig) {
  const token = process.env.VERCEL_SHARE_TOKEN;
  const baseURL = config.projects[0].use.baseURL;
  if (!token || !baseURL) return;
  const browser = await chromium.launch(config.projects[0].use.launchOptions);
  const page = await browser.newPage();
  await page.goto(`${baseURL}/?_vercel_share=${token}`);
  await page.context().storageState({ path: "test-results/vercel-share.json" });
  await browser.close();
}
