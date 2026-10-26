import { expect, test } from "@playwright/test";
import { expectNoBlockingViolations } from "./a11y";
import { e2eCredentials, signIn } from "./helpers";

test.describe("units list", () => {
  test.skip(!e2eCredentials(), "needs E2E_USER / E2E_PASSWORD or a local dev admin");

  for (const locale of ["en", "fr"] as const) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`${locale} ${colorScheme}: no serious or critical accessibility violations`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await signIn(page, locale);
        await page.goto(`/${locale}/inventory/units`, { waitUntil: "networkidle" });
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoBlockingViolations(page);
      });
    }
  }

  test("filters, search and sort live in the URL and keep the language", async ({ page }) => {
    await signIn(page, "fr");
    await page.goto("/fr/inventory/units", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /^Statut/ }).click();
    await page.getByRole("menuitem", { name: "En retenue ou en quarantaine" }).click();
    await expect(page).toHaveURL(/\/fr\/inventory\/units\?.*status=hold/);

    await page.getByRole("searchbox").fill("zzz-no-such-unit");
    await expect(page).toHaveURL(/q=zzz-no-such-unit/);
    await expect(page.getByText("Aucune unité ne correspond à ces filtres")).toBeVisible();

    await page.getByRole("link", { name: "Effacer les filtres" }).click();
    await expect(page).toHaveURL(/\/fr\/inventory\/units$/);
    const sortLink = page.getByRole("columnheader", { name: /Unité/ }).getByRole("link");
    await sortLink.click();
    await expect(page).toHaveURL(/sort=name/);
    await expect(page.getByRole("columnheader", { name: /Unité/ })).toHaveAttribute(
      "aria-sort",
      /ascending|descending/
    );
  });

  test("search treats % as a character, not a wildcard", async ({ page }) => {
    await signIn(page, "en");
    await page.goto("/en/inventory/units?q=%25", { waitUntil: "networkidle" });
    await expect(page.getByText("No units match these filters")).toBeVisible();
  });
});
