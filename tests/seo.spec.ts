import { expect, test } from "@playwright/test";

test.skip(({ isMobile }) => isMobile, "SEO output does not depend on the viewport");

test("dive type + region page has its own title, canonical and breadcrumbs", async ({ page }) => {
  await page.goto("/immersioni/tecnico/piemonte");
  await expect(page).toHaveTitle("Diving tecnico in Piemonte | DiveAdvisor");
  await expect(page.getByRole("heading", { level: 1, name: "Diving tecnico in Piemonte" })).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/immersioni\/tecnico\/piemonte$/);
  const ld = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(ld).toContain("BreadcrumbList");
  // The type is fixed by the URL, so its filter group is hidden.
  await expect(page.getByRole("checkbox", { name: "Tecnico" })).toHaveCount(0);
});

test("unknown dive type returns 404", async ({ page }) => {
  const res = await page.goto("/immersioni/non-esiste");
  expect(res?.status()).toBe(404);
});

test("sitemap lists the directory but never test centres", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  expect(xml).toContain("/diving</loc>");
  // Region and dive type pages appear only once real (non-[TEST]) centres exist there.
  expect(xml).not.toContain("test-");
});

test("test centres are not indexed and have a share image", async ({ page, request }) => {
  await page.goto("/diving/lombardia/test-como-deep-prova-como");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  const res = await request.get(new URL(og!).pathname);
  expect(res.headers()["content-type"]).toContain("image/png");
});

test("for-centres page explains the offer and finds a centre by name", async ({ page }) => {
  await page.goto("/per-i-diving");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("contatti diretti");
  await page.getByLabel("Cerca il tuo diving").fill("Como Deep");
  await page.getByRole("button", { name: "Trova la scheda" }).click();
  await expect(page).toHaveURL(/\/diving\?q=Como\+Deep/);
  await expect(page.getByText("1 diving trovato")).toBeVisible();
  await expect(page.getByRole("link", { name: "[TEST] Como Deep Prova" })).toBeVisible();
});
