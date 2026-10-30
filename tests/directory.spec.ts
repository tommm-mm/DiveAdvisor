import { expect, test } from "@playwright/test";

test("find a centre: list -> filter -> centre page", async ({ page, isMobile }) => {
  await page.goto("/diving");
  await expect(page.getByRole("heading", { level: 1, name: "Diving in Italia" })).toBeVisible();
  const count = page.getByText(/diving trovat/);
  await expect(count).toBeVisible();

  // Filter by technical diving.
  if (isMobile) await page.getByRole("button", { name: /^Filtri/ }).click();
  // A click that lands before hydration is lost: retry until the filter is applied.
  await expect(async () => {
    const box = page.getByRole("checkbox", { name: "Tecnico" });
    if (!(await box.isChecked())) await box.click();
    await expect(page).toHaveURL(/tipo=tecnico/, { timeout: 2000 });
  }).toPass({ timeout: 15000 });
  if (isMobile) await page.keyboard.press("Escape");

  // Every result must offer technical diving; open the first one.
  const first = page.getByRole("article").first();
  await expect(first.getByText("Tecnico")).toBeVisible();
  await first.getByRole("link").first().click();

  await expect(page).toHaveURL(/\/diving\/[a-z-]+\/[a-z0-9-]+$/);
  await expect(page.getByRole("heading", { name: "Scrivi al diving" })).toBeVisible();
  await expect(page.getByText("Nessuna recensione ancora", { exact: true })).toBeVisible();
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

test("activity type is shown and filterable", async ({ page }) => {
  await page.goto("/diving?attivita=diving");
  await expect(page.getByText(/diving trovat/)).toBeVisible();
  await expect(page.getByRole("article").first().getByText("Diving", { exact: true })).toBeVisible();
  await page.goto("/diving?attivita=negozio");
  // No test shop exists: the empty state must appear.
  await expect(page.getByText("Nessun diving corrisponde ai filtri")).toBeVisible();
});

// Relies on the [TEST] data: Como Deep (to Tech 2, CCR, 45 €) and Elba (to Advanced, 38 €).
test("filter by level, specialty and price, then see dives and prices", async ({ page, isMobile }) => {
  test.skip(isMobile, "once on desktop");
  await page.goto("/diving?livello=tech2&specialita=ccr");
  await expect(page.getByLabel("Il mio livello")).toHaveValue("tech2");
  await expect(page.getByRole("checkbox", { name: "Rebreather (CCR)" })).toBeChecked();
  const como = page.getByRole("article").filter({ hasText: "[TEST] Como Deep Prova" });
  await expect(como.getByText(/fino a 60 m · .*CCR.* · da 45/)).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "[TEST] Elba Diving Prova" })).toHaveCount(0);

  await page.goto("/diving?prezzo=40");
  await expect(page.getByRole("article").filter({ hasText: "[TEST] Elba Diving Prova" })).toBeVisible();
  await expect(page.getByRole("article").filter({ hasText: "[TEST] Como Deep Prova" })).toHaveCount(0);

  await page.goto("/diving?livello=tech2");
  await como.getByRole("link").first().click();
  await expect(page.getByRole("heading", { name: "Immersioni e prezzi" })).toBeVisible();
  await expect(page.getByText("Pacchetto 10 immersioni")).toBeVisible();
  await expect(page.getByText(/conferma sempre con il diving/)).toBeVisible();
});
