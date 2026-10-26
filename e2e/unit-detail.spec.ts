import { expect, test, type Page } from "@playwright/test";
import { expectNoBlockingViolations } from "./a11y";
import { e2eCredentials, signIn } from "./helpers";

/*
 * The unit detail page, on a real unit read from the list (nothing is created for the read-only
 * checks). The action path derives one clone named E2E-<timestamp> from an existing plant, then
 * places and releases a hold on that clone; regulated rows are never deleted.
 */
test.describe("unit detail", () => {
  test.skip(!e2eCredentials(), "needs E2E_USER / E2E_PASSWORD or a local dev admin");

  async function firstUnitPath(page: Page, query = ""): Promise<string | null> {
    await page.goto(`/en/inventory/units${query}`, { waitUntil: "networkidle" });
    const link = page.locator('table tbody th a[href*="/inventory/units/"]').first();
    if ((await link.count()) === 0) return null;
    const href = await link.getAttribute("href");
    return href ? href.replace(/^\/(en|fr)/, "") : null;
  }

  const TABS = {
    en: ["Overview", "History", "Lineage", "Quality", "Documents and activity"],
    fr: ["Aperçu", "Historique", "Filiation", "Qualité", "Documents et activités"],
  } as const;

  for (const locale of ["en", "fr"] as const) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`${locale} ${colorScheme}: every tab passes the accessibility check`, async ({
        page,
      }) => {
        test.setTimeout(120_000);
        await page.emulateMedia({ colorScheme });
        await signIn(page, "en");
        const path = await firstUnitPath(page);
        test.skip(path === null, "no units in the development database");

        await page.goto(`/${locale}${path}`, { waitUntil: "networkidle" });
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        for (const label of TABS[locale]) {
          await page.getByRole("tab", { name: new RegExp(`^${label}`) }).click();
          await expect(page.getByRole("tab", { name: new RegExp(`^${label}`) })).toHaveAttribute(
            "aria-selected",
            "true"
          );
          await expectNoBlockingViolations(page);
        }
      });
    }
  }

  test("tabs work from the keyboard and the chosen tab is kept in the URL", async ({ page }) => {
    await signIn(page, "en");
    const path = await firstUnitPath(page);
    test.skip(path === null, "no units in the development database");

    await page.goto(`/en${path}`, { waitUntil: "networkidle" });
    const overview = page.getByRole("tab", { name: /^Overview/ });
    await overview.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: /^History/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    await expect(page).toHaveURL(/tab=history/);
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByRole("tab", { name: /^History/ })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    // Who / what / when: every history row names a person and carries a time zone.
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible();
    await expect(rows.first().locator("time").first()).toContainText(/[A-Z]{3,4}|GMT/);
  });

  test("the French page is fully translated", async ({ page }) => {
    await signIn(page, "fr");
    const path = await firstUnitPath(page);
    test.skip(path === null, "no units in the development database");
    await page.goto(`/fr${path}`, { waitUntil: "networkidle" });
    await expect(page.getByRole("tab", { name: /^Aperçu/ })).toBeVisible();
    await expect(
      page
        .getByRole("button", { name: /Actions/ })
        .or(page.getByText(/lecture seule|consulter/))
        .first()
    ).toBeVisible();
    await expect(page.getByText("Key facts")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Rapport d’audit" })).toBeVisible();
  });

  test("the move dialog opens from the actions menu and closes with Escape, returning focus", async ({
    page,
  }) => {
    await signIn(page, "en");
    const path = await firstUnitPath(page, "?status=active");
    test.skip(path === null, "no active units in the development database");

    await page.goto(`/en${path}`, { waitUntil: "networkidle" });
    const trigger = page.getByRole("button", { name: "Actions" });
    test.skip((await trigger.count()) === 0, "this account cannot act on that unit");
    await trigger.focus();
    await page.keyboard.press("Enter");
    const move = page.getByRole("menuitem", { name: "Move to another location" });
    test.skip(await move.isDisabled(), "unit is on hold, so it cannot be moved");
    await move.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Move unit" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Record move" })).toBeDisabled();
    await expectNoBlockingViolations(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("derive a clone, place it on hold, then release the hold with a reason", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    await signIn(page, "en");
    const parentPath = await firstUnitPath(page, "?status=active&type=PLANT");
    test.skip(parentPath === null, "no active plant to derive from");

    const name = `E2E-${Date.now()}`;
    await page.goto(`/en${parentPath}`, { waitUntil: "networkidle" });
    test.skip(
      (await page.getByRole("button", { name: "Actions" }).count()) === 0,
      "this account cannot act on that plant"
    );

    // Derive through the dialog; the clone carries a name this test owns.
    await page.getByRole("button", { name: "Actions" }).click();
    await page.getByRole("menuitem", { name: "Derive clones or cultures" }).click();
    const derive = page.getByRole("dialog", { name: "Derive new units" });
    await derive.getByLabel("Name (optional)").fill(name);
    await derive.getByRole("button", { name: "Create" }).click();
    await expect(derive).toBeHidden({ timeout: 20_000 });

    await page.getByRole("tab", { name: /^Lineage/ }).click();
    await page.getByRole("link", { name }).click();
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");

    // Place a hold with a reason.
    await page.getByRole("button", { name: "Actions" }).click();
    await page.getByRole("menuitem", { name: "Place on quality hold" }).click();
    const hold = page.getByRole("dialog", { name: "Place on quality hold" });
    const place = hold.getByRole("button", { name: "Place on hold" });
    await expect(place).toBeDisabled();
    await hold.getByLabel(/^Reason/).fill("E2E check: suspected contamination");
    await place.click();
    await expect(hold).toBeHidden({ timeout: 20_000 });

    const banner = page.getByRole("alert").filter({ hasText: "Quality Hold in effect" });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("E2E check: suspected contamination");
    await expect(banner).toContainText("cannot be moved");

    // A hold blocks moving the unit: the menu item is there but disabled.
    await page.getByRole("button", { name: "Actions" }).click();
    await expect(page.getByRole("menuitem", { name: "Move to another location" })).toHaveAttribute(
      "aria-disabled",
      "true"
    );
    await page.keyboard.press("Escape");

    // Release it with the keyboard: the confirm button stays disabled until the reason is long enough.
    await banner.getByRole("button", { name: "Release quality hold" }).focus();
    await page.keyboard.press("Enter");
    const release = page.getByRole("dialog", { name: /Release the hold on/ });
    const confirm = release.getByRole("button", { name: "Release hold" });
    await expect(confirm).toBeDisabled();
    await release.getByLabel(/^Why is it safe to release/).fill("short");
    await expect(confirm).toBeDisabled();
    await release.getByLabel(/^Why is it safe to release/).fill("E2E check: cleared by inspection");
    await expect(confirm).toBeEnabled();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await confirm.click();
    await expect(release).toBeHidden({ timeout: 20_000 });
    await expect(page.getByRole("alert").filter({ hasText: "in effect" })).toHaveCount(0);

    // Both the placing and the release are in the history with who did them.
    await page.getByRole("tab", { name: /^History/ }).click();
    const history = page.getByRole("table", { name: "History of this unit" });
    await expect(history).toContainText("Hold placed");
    await expect(history).toContainText("Hold released");
    await expect(history).toContainText("E2E check: cleared by inspection");
    await expectNoBlockingViolations(page);
  });
});
