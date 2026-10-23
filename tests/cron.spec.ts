import { expect, test } from "@playwright/test";

test.skip(({ isMobile }) => isMobile, "endpoint checked once");

test("daily job rejects calls without the cron secret", async ({ request }) => {
  expect((await request.get("/api/cron/daily")).status()).toBe(401);
  expect((await request.get("/api/cron/daily", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
});

test("daily job runs with the cron secret", async ({ request }) => {
  // Needs the service role key on the server, so it runs against a deployed preview only.
  test.skip(!process.env.E2E_BASE_URL || !process.env.CRON_SECRET, "runs on the preview");
  const res = await request.get("/api/cron/daily", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toHaveProperty("deletedLeads");
  expect(body.errors).toEqual([]);
});
