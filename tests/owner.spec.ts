import { expect, test } from "@playwright/test";
import { E2E_OWNER, hasE2E, signIn } from "./helpers/auth";

test.skip(!hasE2E(), "needs E2E_PASSWORD");
// All tests edit the same test centre: run them one at a time.
test.describe.configure({ mode: "serial" });
test.skip(({ isMobile }) => isMobile, "runs once on desktop");

test("owner edits the listing and the public page updates", async ({ page, context, baseURL }) => {
  await signIn(context, E2E_OWNER, baseURL!);
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Modifica scheda" }).first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Modifica");

  const description = `[TEST] Scheda di prova aggiornata dal titolare ${Date.now()}.`;
  await page.getByLabel("Descrizione").fill(description);
  await page.getByLabel("Sito web").fill("non-un-sito");
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page.getByText("Inserisci un indirizzo che inizia con https://")).toBeVisible();

  await page.getByLabel("Sito web").fill("https://example.com");
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page.getByText("Modifiche salvate")).toBeVisible();

  await page.getByRole("link", { name: "Vedi la scheda pubblica" }).click();
  await expect(page.getByText(description)).toBeVisible();
});

test("a user cannot open someone else's edit page", async ({ page, context, baseURL }) => {
  await signIn(context, E2E_OWNER, baseURL!);
  // Como Deep Prova is owned by another account.
  await page.goto("/diving/lombardia/test-como-deep-prova-como");
  const res = await page.goto("/dashboard/scheda/00000000-0000-0000-0000-000000000000");
  expect(res?.status()).toBe(404);
});

// 8x8 PNG, enough for the browser to decode, resize and re-encode.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGNQaDiAFTEMLQkAOsZYAYJCUNYAAAAASUVORK5CYII=", "base64");

test("owner uploads a photo and adds a video; both show on the public page", async ({ page, context, baseURL }) => {
  await signIn(context, E2E_OWNER, baseURL!);
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Modifica scheda" }).first().click();

  await page.locator('input[type="file"]').setInputFiles({ name: "foto.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Foto caricata.")).toBeVisible({ timeout: 15000 });
  await expect(page.getByText("Copertina", { exact: true })).toBeVisible();

  await page.getByLabel("Video 1").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByLabel("Video 2").fill("https://example.com/video");
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page.getByText("Usa un link di YouTube")).toBeVisible();
  await page.getByLabel("Video 2").fill("");
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page.getByText("Modifiche salvate")).toBeVisible();

  await page.getByRole("link", { name: "Vedi la scheda pubblica" }).click();
  await expect(page.locator('img[src*="center-photos"]').first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Guarda il video/ })).toBeVisible();

  // Clean up: delete the photo and the video again.
  await page.goBack();
  await page.getByRole("button", { name: "Elimina" }).first().click();
  await expect(page.getByText("Foto eliminata.")).toBeVisible();
  await page.getByLabel("Video 1").fill("");
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page.getByText("Modifiche salvate")).toBeVisible();
});
