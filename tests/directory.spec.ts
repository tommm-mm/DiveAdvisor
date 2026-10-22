import { expect, test } from "@playwright/test";

test("find a centre: list -> filter -> centre page", async ({ page, isMobile }) => {
  await page.goto("/diving");
  await expect(page.getByRole("heading", { level: 1, name: "Diving in Italia" })).toBeVisible();
  const count = page.getByText(/diving trovat/);
  await expect(count).toBeVisible();

  // Filter by technical diving.
  if (isMobile) await page.getByRole("button", { name: /^Filtri/ }).click();
  await page.getByRole("checkbox", { name: "Tecnico" }).click();
  await expect(page).toHaveURL(/tipo=tecnico/);
  if (isMobile) await page.keyboard.press("Escape");

  // Every result must offer technical diving; open the first one.
  const first = page.getByRole("article").first();
  await expect(first.getByText("Tecnico")).toBeVisible();
  await first.getByRole("link", { name: "Vedi scheda" }).click();

  await expect(page).toHaveURL(/\/diving\/[a-z-]+\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { name: "Contatti" })).toBeVisible();
  await expect(page.getByText("Nessuna recensione", { exact: true })).toBeVisible();
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
});

test("no results shows an empty state", async ({ page }) => {
  await page.goto("/diving?regione=toscana&tipo=lago");
  await expect(page.getByText("Nessun diving corrisponde ai filtri")).toBeVisible();
});

test("unknown centre returns 404", async ({ page }) => {
  const res = await page.goto("/diving/lombardia/non-esiste");
  expect(res?.status()).toBe(404);
});

test("map renders markers on desktop", async ({ page, isMobile }) => {
  test.skip(isMobile, "map is behind a toggle on mobile");
  await page.goto("/diving/liguria");
  await expect(page.locator(".leaflet-interactive").first()).toBeVisible();
});
