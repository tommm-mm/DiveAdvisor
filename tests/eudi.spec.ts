import { expect, test } from "@playwright/test";

test("EUDI page: find your listing and validate the add-business form", async ({ page }) => {
  await page.goto("/eudi");
  await expect(page.getByRole("heading", { level: 1, name: "Ci vediamo a EUDI" })).toBeVisible();
  await page.getByLabel("Cerca la tua scheda").fill("Como Deep");
  await page.getByRole("button", { name: "Trova e rivendica gratis" }).click();
  await expect(page).toHaveURL(/\/diving\?q=Como\+Deep/);

  await page.goto("/eudi");
  await page.getByLabel("Sito web (facoltativo)").fill("non-un-sito");
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15000 });
  await page.getByRole("button", { name: "Aggiungi attività" }).click();
  await expect(page.getByText("Indica il nome dell'attività")).toBeVisible();
  await expect(page.getByText("Indica la città")).toBeVisible();
  await expect(page.getByText("Inserisci un indirizzo email valido")).toBeVisible();
  await expect(page.getByText("Il sito deve iniziare con https://")).toBeVisible();
});

test("for-centres page links to the add-business form", async ({ page, isMobile }) => {
  test.skip(isMobile, "once on desktop");
  await page.goto("/per-i-diving");
  await page.getByRole("link", { name: "Aggiungi la tua attività" }).click();
  await expect(page).toHaveURL(/\/eudi#aggiungi$/);
});
