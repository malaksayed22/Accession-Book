import { expect, test } from "@playwright/test";
import { expectNoBlockingViolations } from "./a11y";
import { e2eCredentials, signIn } from "./helpers";

/**
 * The insight pages: dashboard, compliance console, reports, audit trail and search. They are read
 * only, so the spec runs against the shared development database and asserts structure, never
 * global counts.
 */
const PAGES = [
  "/dashboard",
  "/compliance",
  "/compliance/reports",
  "/compliance/reports/ctls-monthly",
  "/compliance/reports/inventory-snapshot",
  "/compliance/reports/state-at-date",
  "/compliance/reports/destruction-register",
  "/compliance/audit",
  "/search",
  "/search?q=un",
] as const;

test.describe("insight pages", () => {
  test.skip(!e2eCredentials(), "needs E2E_USER / E2E_PASSWORD or a local dev admin");
  test.setTimeout(240_000);

  for (const locale of ["en", "fr"] as const) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`${locale} ${colorScheme}: no serious or critical accessibility violations`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await signIn(page, locale);
        for (const path of PAGES) {
          await page.goto(`/${locale}${path}`, { waitUntil: "networkidle", timeout: 60_000 });
          await expect(page.getByRole("heading", { level: 1 }), path).toHaveCount(1);
          await expectNoBlockingViolations(page);
        }
      });
    }
  }

  test("dashboard cards open the filtered lists and keep the language", async ({ page }) => {
    await signIn(page, "fr");
    await page.goto("/fr/dashboard", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "À surveiller" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Aperçu de l’inventaire" })).toBeVisible();
    await page
      .getByRole("link", { name: /Unités en retenue/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/fr\/inventory\/units\?status=hold/);
  });

  test("compliance console states the status and lists next steps", async ({ page }) => {
    await signIn(page, "en");
    await page.goto("/en/compliance", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Findings and next steps" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "CTLS monthly return" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Destruction register" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Audit chain integrity" })).toBeVisible();
    // The audit chain is verified when an administrator opens the console.
    await expect(page.getByText(/Audit chain (intact|broken)|Nothing to verify/)).toBeVisible();
  });

  test("reports: the catalog opens a report whose filters live in the URL", async ({ page }) => {
    await signIn(page, "en");
    await page.goto("/en/compliance/reports", { waitUntil: "networkidle" });
    await page
      .getByRole("main")
      .getByRole("link", { name: /Destruction register/ })
      .click();
    await expect(page).toHaveURL(/\/en\/compliance\/reports\/destruction-register/);

    await page.getByLabel("From", { exact: true }).fill("2026-01-01");
    await page.getByLabel("To", { exact: true }).fill("2026-01-31");
    await page.getByRole("button", { name: "Generate report" }).click();
    await expect(page).toHaveURL(/from=2026-01-01.*to=2026-01-31/, { timeout: 30_000 });
    await expect(page.getByRole("link", { name: "Download CSV" })).toHaveAttribute(
      "href",
      /\/api\/reports\/destruction-register\?.*from=2026-01-01.*to=2026-01-31.*format=csv/
    );
    await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();
  });

  test("reports: a malformed date is refused, not silently widened", async ({ page }) => {
    await signIn(page, "en");
    await page.goto("/en/compliance/reports/destruction-register?from=2026-02-31", {
      waitUntil: "networkidle",
    });
    await expect(page.getByText("Some parameters were not valid")).toBeVisible();
    await expect(page.getByRole("link", { name: "Download CSV" })).toHaveCount(0);

    const response = await page.request.get(
      "/api/reports/destruction-register?from=2026-02-31&format=csv"
    );
    expect(response.status()).toBe(400);
  });

  test("reports are translated in French", async ({ page }) => {
    await signIn(page, "fr");
    await page.goto("/fr/compliance/reports/ctls-monthly", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Sommaire mensuel de l’inventaire CTLS"
    );
    await expect(
      page.getByRole("heading", { name: "Rapprochement de l’inventaire" })
    ).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Ouverture" })).toBeVisible();
  });

  test("audit trail: filters, search and paging live in the URL", async ({ page }) => {
    await signIn(page, "en");
    await page.goto("/en/compliance/audit", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1, name: "Audit trail" })).toBeVisible();

    await page.getByRole("searchbox", { name: "Search" }).fill("zzz-no-such-entry-zzz");
    await expect(page).toHaveURL(/q=zzz-no-such-entry-zzz/);
    await expect(page.getByText("No entries match these filters")).toBeVisible();

    await page.getByRole("link", { name: "Clear filters" }).first().click();
    await expect(page).toHaveURL(/\/en\/compliance\/audit$/);
    await expect(page.getByRole("table")).toBeVisible();

    // An out-of-range date is ignored with a message, never turned into a wrong filter.
    await page.goto("/en/compliance/audit?from=not-a-date", { waitUntil: "networkidle" });
    await expect(page.getByText(/A date was not valid and was ignored/)).toBeVisible();
  });

  test("audit trail: the chain panel verifies on demand and says the result", async ({ page }) => {
    await signIn(page, "en");
    await page.goto("/en/compliance/audit", { waitUntil: "networkidle" });
    await expect(page.getByText("Not verified in this view")).toBeVisible();
    await page.getByRole("button", { name: "Verify audit chain" }).click();
    await expect(page).toHaveURL(/verify=1/);
    await expect(page.getByText(/Audit chain intact|Nothing to verify yet/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Verify again" })).toBeVisible();
  });

  test("search groups results and treats % as a character", async ({ page }) => {
    await signIn(page, "en");
    await page.goto("/en/search", { waitUntil: "networkidle" });
    await page.getByRole("searchbox").fill("%%");
    await expect(page).toHaveURL(/q=%25%25/);
    await expect(page.getByText(/No results for/)).toBeVisible();

    await page.goto("/en/search?q=a", { waitUntil: "networkidle" });
    await expect(page.getByText("Type a little more")).toBeVisible();
  });
});
