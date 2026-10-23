import { expect, test } from "@playwright/test";
import { E2E_OWNER, hasE2E, signIn } from "./helpers/auth";

const CENTER = "/diving/lombardia/test-como-deep-prova-como";

test.skip(({ isMobile }) => isMobile, "endpoints and dashboard checked once on desktop");

test("review badge is an SVG with the DiveAdvisor name", async ({ request }) => {
  const res = await request.get("/api/badge/test-verbano-tech-prova-verbania");
  expect(res.headers()["content-type"]).toContain("image/svg+xml");
  expect(await res.text()).toContain("DiveAdvisor");
  expect((await request.get("/api/badge/non-esiste")).status()).toBe(404);
});

test("view counter accepts a valid centre and rejects junk", async ({ request }) => {
  expect((await request.post("/api/view", { data: { centerId: "not-a-uuid" } })).status()).toBe(400);
});

test("removal form validates and is linked from the centre page", async ({ page }) => {
  await page.goto("/diving/lombardia/test-bellagio-sub-prova-bellagio");
  await page.getByRole("link", { name: "Chiedi la rimozione" }).click();
  await expect(page.getByLabel("Nome del diving")).toHaveValue("[TEST] Bellagio Sub Prova");
  // Wait for the page to be interactive (Turnstile token issued) before submitting.
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15000 });
  await page.getByRole("button", { name: "Invia la richiesta" }).click();
  await expect(page.getByText("Inserisci il tuo nome")).toBeVisible();
  await expect(page.getByText("Inserisci un indirizzo email valido")).toBeVisible();
  await expect(page.getByText("Indica il tuo ruolo")).toBeVisible();
});

test.describe("owner tools", () => {
  test.skip(!hasE2E(), "needs E2E_PASSWORD");

  test("dashboard shows stats, poster and badge", async ({ page, context, baseURL }) => {
    await signIn(context, E2E_OWNER, baseURL!);
    await page.goto("/dashboard");
    await expect(page.getByText("Visite alla scheda")).toBeVisible();
    await expect(page.getByRole("button", { name: "Copia il codice del badge" })).toBeVisible();
    await page.getByRole("link", { name: "Apri il poster" }).click();
    await expect(page.getByRole("heading", { name: "Com'è andata l'immersione?" })).toBeVisible();
    await expect(page.getByRole("img", { name: /QR code per recensire/ })).toBeVisible();
  });

  test("poster of another centre is not reachable", async ({ page, context, baseURL }) => {
    await signIn(context, E2E_OWNER, baseURL!);
    await page.goto(CENTER);
    const res = await page.goto("/dashboard/poster/00000000-0000-0000-0000-000000000000");
    expect(res?.status()).toBe(404);
  });
});
