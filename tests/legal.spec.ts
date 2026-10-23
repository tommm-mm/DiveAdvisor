import { expect, test } from "@playwright/test";

test.skip(({ isMobile }) => isMobile, "content pages checked once on desktop");

for (const [path, heading] of [
  ["/termini", "Termini d'uso"],
  ["/privacy", "Informativa privacy"],
  ["/come-verifichiamo-le-recensioni", "Come verifichiamo le recensioni"],
] as const) {
  test(`${path} is reachable from the footer and marked as draft`, async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: heading === "Informativa privacy" ? "Privacy" : heading }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText("Bozza in revisione")).toBeVisible();
  });
}

test("login requires accepting the terms", async ({ page }) => {
  await page.goto("/accedi");
  await page.getByLabel("Email").fill("prova@example.com");
  await page.getByRole("button", { name: "Invia link di accesso" }).click();
  await expect(page.getByText("Per continuare accetta i termini")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("prova@example.com");
});
