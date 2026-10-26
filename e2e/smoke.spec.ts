import { expect, test } from "@playwright/test";

test("health endpoint answers without touching the database", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("readiness endpoint confirms the database answers, and leaks nothing", async ({ request }) => {
  const response = await request.get("/api/ready");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ready" });
});

test("login page renders the sign-in form", async ({ page }) => {
  await page.goto("/en/login");
  await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  await expect(page.getByLabel(/username/i)).toBeVisible();
  await expect(page.getByLabel(/password/i)).toBeVisible();
});

test("private pages redirect anonymous visitors to sign in", async ({ page }) => {
  await page.goto("/en/records/members");
  await expect(page).toHaveURL(/\/en\/login\?next=%2Fmembers/);
});

test("anonymous API calls are refused", async ({ request }) => {
  const response = await request.get("/api/units/1/ledger");
  expect(response.status()).toBe(401);
});
