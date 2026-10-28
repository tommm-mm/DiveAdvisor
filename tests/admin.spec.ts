import { expect, test } from "@playwright/test";
import { E2E_DIVER, E2E_OWNER, hasE2E, signIn } from "./helpers/auth";

test.skip(({ isMobile }) => isMobile, "runs once on desktop");

test("admin area is hidden from visitors and other users", async ({ page, context, baseURL }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/accedi\?next=%2Fadmin/);
  test.skip(!hasE2E(), "needs E2E_PASSWORD");
  await signIn(context, E2E_OWNER, baseURL!);
  const res = await page.goto("/admin");
  expect(res?.status()).toBe(404);
});

// Runs only where the diver test account is listed in ADMIN_LOGIN_EMAILS (local runs, never production).
test("admin adds a listing, edits it and hides it", async ({ page, context, baseURL }) => {
  test.skip(!hasE2E() || !(process.env.ADMIN_LOGIN_EMAILS ?? "").includes(E2E_DIVER), "needs the diver as admin");
  await signIn(context, E2E_DIVER, baseURL!);
  await page.goto("/admin/nuovo");
  const name = `[TEST] Admin Prova ${Date.now()}`;

  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByText("Indica il nome")).toBeVisible();

  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByLabel("Regione").selectOption("Liguria");
  await page.getByLabel("Città").fill("Lerici");
  await page.getByLabel("Telefono").fill("+39 0187 000000");
  await page.getByRole("button", { name: "Uguale al telefono" }).click();
  await expect(page.getByLabel("WhatsApp")).toHaveValue("+39 0187 000000");
  await page.getByRole("checkbox", { name: "Mare" }).click();
  await page.getByRole("button", { name: "Salva e aggiungi un'altra" }).click();
  await expect(page.getByText(`${name} è online.`)).toBeVisible({ timeout: 20000 });
  // The area is kept for the next listing.
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Città")).toHaveValue("Lerici");

  await page.getByRole("link", { name: "Apri" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  await page.getByLabel("Descrizione").fill("[TEST] Descrizione dall'area admin.");
  await page.getByRole("button", { name: "Salva", exact: true }).click();
  await expect(page.getByText("Salvato. È già online.")).toBeVisible({ timeout: 20000 });

  await page.getByRole("button", { name: "Nascondi" }).click();
  await expect(page.getByText("Scheda nascosta")).toBeVisible();

  await page.goto("/admin");
  await page.getByRole("button", { name: "Nascoste" }).click();
  await expect(page.getByText(name)).toBeVisible();
});
