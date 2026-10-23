import { expect, test } from "@playwright/test";
import { E2E_OWNER, hasE2E, signIn } from "./helpers/auth";

test.skip(!hasE2E(), "needs E2E_PASSWORD");
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
