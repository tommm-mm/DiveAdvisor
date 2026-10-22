import { expect, test } from "@playwright/test";

const CENTER = "/diving/lombardia/test-como-deep-prova-como";

test("contact form shows field errors without sending", async ({ page }) => {
  await page.goto(CENTER);
  const form = page.locator("#contatta");
  await form.getByRole("button", { name: "Invia richiesta" }).click();
  await expect(form.getByText("Inserisci il tuo nome")).toBeVisible();
  await expect(form.getByText("Inserisci un indirizzo email valido")).toBeVisible();
  await expect(form.getByText("Scrivi almeno 10 caratteri")).toBeVisible();
  await expect(form.getByText("Serve il consenso per inviare la richiesta")).toBeVisible();
  // Values typed so far are kept after a failed attempt.
  await form.getByLabel("Nome").fill("Mario");
  await form.getByRole("button", { name: "Invia richiesta" }).click();
  await expect(form.getByLabel("Nome")).toHaveValue("Mario");
});

test("mobile contact bar jumps to the form", async ({ page, isMobile }) => {
  test.skip(!isMobile, "bar is mobile only");
  await page.goto(CENTER);
  await page.getByRole("link", { name: "Contatta", exact: true }).click();
  await expect(page).toHaveURL(/#contatta$/);
  await expect(page.getByLabel("Nome")).toBeInViewport();
});

test("protected pages send visitors to login and back", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/accedi\?next=%2Fdashboard/);
  await page.goto("/rivendica/test-como-deep-prova-como");
  await expect(page).toHaveURL(/\/accedi\?next=%2Frivendica%2Ftest-como-deep-prova-como/);
});

test("login form validates the email", async ({ page }) => {
  await page.goto("/accedi");
  await page.getByLabel("Email").fill("non-una-email");
  await page.getByRole("button", { name: "Invia link di accesso" }).click();
  await expect(page.getByText("Inserisci un indirizzo email valido")).toBeVisible();
});

test("claim link is shown on unclaimed centres", async ({ page }) => {
  await page.goto(CENTER);
  await expect(page.getByRole("link", { name: "Rivendica questa scheda" })).toHaveAttribute("href", "/rivendica/test-como-deep-prova-como");
});
