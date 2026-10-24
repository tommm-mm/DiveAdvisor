import { expect, test } from "@playwright/test";
import { E2E_DIVER, E2E_OWNER, hasE2E, signIn } from "./helpers/auth";

const CENTER = "/diving/lombardia/test-como-deep-prova-como";
const E2E_CENTER = "/diving/piemonte/test-verbano-tech-prova-verbania";

test("centre page shows the reviews section and a link to write one", async ({ page }) => {
  await page.goto(CENTER);
  const section = page.locator("section", { has: page.getByRole("heading", { name: "Recensioni" }) });
  await expect(section).toBeVisible();
  await expect(section.getByRole("link", { name: "Scrivi una recensione" })).toHaveAttribute("href", `${CENTER}/recensione`);
});

test("visitors can write a review without logging in and must give an email", async ({ page }) => {
  await page.goto(`${CENTER}/recensione?codice=ABCD-EFGH`);
  await expect(page).toHaveURL(/\/recensione\?codice=ABCD-EFGH$/);
  await expect(page.getByLabel("Codice di verifica (facoltativo)")).toHaveValue("ABCD-EFGH");
  await expect(page.getByLabel("La tua email")).toBeVisible();
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15000 });
  await page.getByRole("button", { name: "Pubblica recensione" }).click();
  await expect(page.getByText("Scegli un voto da 1 a 5")).toHaveCount(6);
});

test("visitor review: wrong code is reported before any email is sent", async ({ page, isMobile }) => {
  // Draft creation uses the service role: runs against the preview only.
  test.skip(!process.env.E2E_BASE_URL, "runs on the preview");
  test.skip(isMobile, "runs once on desktop");
  await page.goto(`${CENTER}/recensione?codice=ZZZZ-ZZZZ`);
  for (const label of ["Sicurezza", "Attrezzatura", "Briefing", "Dimensione del gruppo", "Ambiente", "Rapporto qualità/prezzo"]) {
    await page.getByLabel(`${label}: 4 su 5`).check({ force: true });
  }
  await page.getByLabel("Data dell'immersione").fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel("La tua esperienza").fill("[TEST] Recensione da visitatore senza accesso, per provare il codice errato.");
  await page.getByLabel("La tua email").fill("e2e-visitor@diveadvisor.test");
  await page.getByLabel(/Ho fatto davvero questa immersione/).check();
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15000 });
  await page.getByRole("button", { name: "Pubblica recensione" }).click();
  await expect(page.getByText("Codice non valido, già usato o scaduto.", { exact: false })).toBeVisible();

  // Without the code the draft is created and a confirmation email is announced.
  await page.getByLabel("Codice di verifica (facoltativo)").fill("");
  await expect(page.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15000 });
  await page.getByRole("button", { name: "Pubblica recensione" }).click();
  await expect(page.getByText("Controlla la tua email")).toBeVisible();
});

test("confirmation link with a bad token shows an error", async ({ page, isMobile }) => {
  test.skip(!process.env.E2E_BASE_URL, "runs on the preview");
  test.skip(isMobile, "runs once on desktop");
  await page.goto("/recensione/conferma?token=non-valido");
  await page.getByRole("button", { name: "Conferma e pubblica" }).click();
  await expect(page.getByText("Link scaduto o già usato")).toBeVisible();
});

test.describe("logged in", () => {
  test.skip(!hasE2E(), "needs E2E_PASSWORD");
  // Shared DB state: run these in order, once (desktop only).
  test.describe.configure({ mode: "serial" });
  test.skip(({ isMobile }) => isMobile, "runs once on desktop");

  test("review form validates every field", async ({ page, context, baseURL }) => {
    await signIn(context, E2E_DIVER, baseURL!);
    await page.goto(`${CENTER}/recensione`);
    await page.getByLabel("Codice di verifica (facoltativo)").fill("ABC");
    await page.getByRole("button", { name: "Pubblica recensione" }).click();
    await expect(page.getByText("Scegli un voto da 1 a 5")).toHaveCount(6);
    await expect(page.getByText("Inserisci la data dell'immersione")).toBeVisible();
    await expect(page.getByText("Scrivi almeno 40 caratteri")).toBeVisible();
    await expect(page.getByText("Il codice ha 8 caratteri")).toBeVisible();
    await expect(page.getByText("Conferma che la recensione rispetta le regole")).toBeVisible();
  });

  test("verified review end to end: code, review, owner reply", async ({ browser, baseURL }) => {
    // 1. Owner generates a code in the dashboard.
    const shared = process.env.VERCEL_SHARE_TOKEN ? { storageState: "test-results/vercel-share.json" } : {};
    const ownerCtx = await browser.newContext(shared);
    await signIn(ownerCtx, E2E_OWNER, baseURL!);
    const owner = await ownerCtx.newPage();
    await owner.goto("/dashboard");
    await owner.getByRole("button", { name: "Genera codice" }).click();
    const code = (await owner.getByTestId("verification-code").first().textContent())!;
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    // 2. Diver opens the prefilled link and submits the review.
    const diverCtx = await browser.newContext(shared);
    await signIn(diverCtx, E2E_DIVER, baseURL!);
    const diver = await diverCtx.newPage();
    await diver.goto(`${E2E_CENTER}/recensione?codice=${code}`);
    await expect(diver.getByLabel("Codice di verifica (facoltativo)")).toHaveValue(code);
    for (const label of ["Sicurezza", "Attrezzatura", "Briefing", "Dimensione del gruppo", "Ambiente", "Rapporto qualità/prezzo"]) {
      await diver.getByLabel(`${label}: 5 su 5`).check({ force: true });
    }
    const today = new Date().toISOString().slice(0, 10);
    await diver.getByLabel("Data dell'immersione").fill(today);
    const text = `[TEST] Immersione E2E ${Date.now()}: briefing chiaro, gruppo piccolo, attrezzatura in ordine.`;
    await diver.getByLabel("La tua esperienza").fill(text);
    await diver.getByLabel(/Ho fatto davvero questa immersione/).check();
    // Wait for the Turnstile widget to issue its token (real users are never this fast).
    await expect(diver.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15000 });
    await diver.getByRole("button", { name: "Pubblica recensione" }).click();
    await expect(diver.getByText("Recensione pubblicata")).toBeVisible();

    // 3. The dashboard shows the code as used.
    await owner.reload();
    await expect(owner.locator("li", { hasText: code }).getByText("Usato", { exact: true })).toBeVisible();

    // 4. The review is public and marked verified.
    await diver.goto(E2E_CENTER);
    const item = diver.locator("li", { hasText: text });
    await expect(item.getByText("Verificata", { exact: true })).toBeVisible();

    // 5. Owner replies; the reply shows on the public page.
    const ownerItem = owner.locator("li", { hasText: text });
    const reply = `[TEST] Grazie, a presto ${Date.now()}`;
    await ownerItem.getByLabel("La tua risposta pubblica").fill(reply);
    await ownerItem.getByRole("button", { name: "Pubblica risposta" }).click();
    await expect(owner.locator("li", { hasText: text }).getByRole("button", { name: "Aggiorna risposta" })).toBeVisible();
    await diver.reload();
    await expect(diver.locator("li", { hasText: text }).getByText(reply)).toBeVisible();

    // 6. The same code cannot be used twice, even for a new review.
    await diver.goto(`${E2E_CENTER}/recensione?codice=${code}`);
    await expect(diver.getByText("Hai già recensito l'immersione del")).toBeVisible();
    for (const label of ["Sicurezza", "Attrezzatura", "Briefing", "Dimensione del gruppo", "Ambiente", "Rapporto qualità/prezzo"]) {
      await diver.getByLabel(`${label}: 4 su 5`).check({ force: true });
    }
    await diver.getByLabel("Data dell'immersione").fill(today);
    await diver.getByLabel("La tua esperienza").fill(`${text} Seconda volta con lo stesso codice.`);
    await diver.getByLabel(/Ho fatto davvero questa immersione/).check();
    await expect(diver.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15000 });
    await diver.getByRole("button", { name: "Pubblica recensione" }).click();
    await expect(diver.getByText("Codice non valido, già usato o scaduto.", { exact: false })).toBeVisible();

    await ownerCtx.close();
    await diverCtx.close();
  });

  test("group invite link: verified review, once per person", async ({ browser, baseURL }) => {
    const shared = process.env.VERCEL_SHARE_TOKEN ? { storageState: "test-results/vercel-share.json" } : {};
    const ownerCtx = await browser.newContext(shared);
    await signIn(ownerCtx, E2E_OWNER, baseURL!);
    const owner = await ownerCtx.newPage();
    await owner.goto("/dashboard");
    await owner.getByLabel("Subacquei nel gruppo").selectOption("4");
    await owner.getByRole("button", { name: "Crea il link per il gruppo" }).click();
    await expect(owner.getByText("vale per 4 recensioni verificate")).toBeVisible();
    const wa = await owner.getByRole("link", { name: "Invia su WhatsApp" }).getAttribute("href");
    const link = decodeURIComponent(wa!.split("text=")[1]).match(/https?:\/\/\S+/)![0];

    const diverCtx = await browser.newContext(shared);
    await signIn(diverCtx, E2E_DIVER, baseURL!);
    const diver = await diverCtx.newPage();
    const fill = async (text: string) => {
      await diver.goto(new URL(link).pathname + new URL(link).search);
      for (const label of ["Sicurezza", "Attrezzatura", "Briefing", "Dimensione del gruppo", "Ambiente", "Rapporto qualità/prezzo"]) {
        await diver.getByLabel(`${label}: 5 su 5`).check({ force: true });
      }
      await diver.getByLabel("Data dell'immersione").fill(new Date().toISOString().slice(0, 10));
      await diver.getByLabel("La tua esperienza").fill(text);
      await diver.getByLabel(/Ho fatto davvero questa immersione/).check();
      await expect(diver.locator('input[name="cf-turnstile-response"]')).not.toHaveValue("", { timeout: 15000 });
      await diver.getByRole("button", { name: "Pubblica recensione" }).click();
    };
    await fill(`[TEST] Uscita di gruppo ${Date.now()}: tutto organizzato bene, gruppo piccolo e guida attenta.`);
    await expect(diver.getByText("Recensione pubblicata")).toBeVisible();
    await fill(`[TEST] Seconda recensione con lo stesso link di gruppo ${Date.now()}, non deve passare.`);
    await expect(diver.getByText("Codice non valido, già usato o scaduto.", { exact: false })).toBeVisible();

    await owner.reload();
    await expect(owner.getByText("Gruppo · 1/4 usati").first()).toBeVisible();
    await ownerCtx.close();
    await diverCtx.close();
  });
});
