import { expect, test, type Page } from "@playwright/test";
import { expectNoBlockingViolations } from "./a11y";
import { e2eCredentials, signIn } from "./helpers";

type Locale = "en" | "fr";

const WORDS = {
  en: {
    next: "Next",
    back: "Back",
    create: "Create experiment",
    removeGroup: /Remove unit group 1/,
    stepAria: "Steps",
    created: /Experiment created/,
    edit: "Edit",
    save: "Save changes",
    updated: "Experiment updated",
    noMatch: "No experiments match these filters",
    notFound: "Page not found",
    running: "Running",
    table: "Table",
    nameLabel: /Experiment name/,
    nameRequired: "Enter a name for the experiment.",
  },
  fr: {
    next: "Suivant",
    back: "Précédent",
    create: "Créer l’expérience",
    removeGroup: /Retirer le groupe d’unités 1/,
    stepAria: "Étapes",
    created: /Expérience créée/,
    edit: "Modifier",
    save: "Enregistrer les modifications",
    updated: "Expérience mise à jour",
    noMatch: "Aucune expérience ne correspond à ces filtres",
    notFound: "Page introuvable",
    running: "En cours",
    table: "Tableau",
    nameLabel: /Nom de l’expérience/,
    nameRequired: "Saisissez un nom pour l’expérience.",
  },
} as const;

/**
 * Creates (once per worker) an experiment named E2E-<timestamp> through the API, so the detail page
 * has something to show whatever the shared development database holds. Regulated rows are never
 * deleted, which is why the name makes the leftovers recognisable.
 */
let createdId: number | null = null;
async function ensureExperiment(page: Page): Promise<number> {
  if (createdId) return createdId;
  const today = new Date().toISOString().slice(0, 10);
  const response = await page.request.post("/api/experiments", {
    data: { name: `E2E-${Date.now()}`, startDate: today, endDate: "2099-12-31" },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const body = (await response.json()) as { id: number };
  createdId = body.id;
  return createdId;
}

const step = (page: Page, locale: Locale) =>
  page.getByRole("navigation", { name: WORDS[locale].stepAria }).locator('[aria-current="step"]');

async function openWizard(page: Page, locale: Locale) {
  await page.goto(`/${locale}/inventory/experiments/new`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByLabel(WORDS[locale].nameLabel)).toBeVisible();
}

test.describe("experiments", () => {
  test.skip(!e2eCredentials(), "needs E2E_USER / E2E_PASSWORD or a local dev admin");

  for (const locale of ["en", "fr"] as const) {
    for (const colorScheme of ["light", "dark"] as const) {
      const label = `${locale} ${colorScheme}`;

      test(`${label}: list has no serious or critical accessibility violations`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await signIn(page, locale);
        await ensureExperiment(page);
        await page.goto(`/${locale}/inventory/experiments`, { waitUntil: "networkidle" });
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoBlockingViolations(page);
        await page.goto(`/${locale}/inventory/experiments?view=table`, {
          waitUntil: "networkidle",
        });
        await expect(page.getByRole("table")).toBeVisible();
        await expectNoBlockingViolations(page);
      });

      test(`${label}: detail page has no serious or critical accessibility violations`, async ({
        page,
      }) => {
        await page.emulateMedia({ colorScheme });
        await signIn(page, locale);
        const id = await ensureExperiment(page);
        await page.goto(`/${locale}/inventory/experiments/${id}`, { waitUntil: "networkidle" });
        await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E-");
        await expectNoBlockingViolations(page);
      });

      test(`${label}: every wizard step has no serious or critical accessibility violations`, async ({
        page,
      }) => {
        const words = WORDS[locale];
        await page.emulateMedia({ colorScheme });
        await signIn(page, locale);
        await openWizard(page, locale);

        // Step 1, then the same step showing its errors.
        await expectNoBlockingViolations(page);
        await page.getByRole("button", { name: words.next, exact: true }).click();
        await expect(page.getByText(words.nameRequired)).toBeVisible();
        await expectNoBlockingViolations(page);

        // Step 2: the unit group, with its errors, then with the group removed.
        await page.getByLabel(words.nameLabel).fill(`E2E-a11y-${Date.now()}`);
        await page.getByRole("button", { name: words.next, exact: true }).click();
        await expect(step(page, locale)).toContainText(/2/);
        await expectNoBlockingViolations(page);
        await page.getByRole("button", { name: words.next, exact: true }).click();
        await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
        await expectNoBlockingViolations(page);
        await page.getByRole("button", { name: words.removeGroup }).click();

        // Steps 3 and 4.
        await page.getByRole("button", { name: words.next, exact: true }).click();
        await expect(step(page, locale)).toContainText(/3/);
        await expectNoBlockingViolations(page);
        await page.getByRole("button", { name: words.next, exact: true }).click();
        await expect(step(page, locale)).toContainText(/4/);
        await expectNoBlockingViolations(page);
      });
    }
  }

  test("search, status and membership filters live in the URL and keep the language", async ({
    page,
  }) => {
    await signIn(page, "fr");
    await ensureExperiment(page);
    await page.goto("/fr/inventory/experiments", { waitUntil: "networkidle" });

    await page.getByRole("button", { name: /^Statut/ }).click();
    await page.getByRole("menuitem", { name: WORDS.fr.running }).click();
    await expect(page).toHaveURL(/\/fr\/inventory\/experiments\?.*status=running/, {
      timeout: 20_000,
    });

    await page.getByRole("link", { name: "Mes expériences" }).click();
    await expect(page).toHaveURL(/mine=1/, { timeout: 20_000 });

    await page.getByRole("searchbox").fill("zzz-no-such-experiment");
    await expect(page).toHaveURL(/q=zzz-no-such-experiment/, { timeout: 20_000 });
    await expect(page.getByText(WORDS.fr.noMatch)).toBeVisible();

    await page.getByRole("link", { name: "Effacer les filtres" }).first().click();
    await expect(page).toHaveURL(/\/fr\/inventory\/experiments$/, { timeout: 20_000 });
  });

  test("the view toggle switches between cards and a sortable table", async ({ page }) => {
    await signIn(page, "en");
    await ensureExperiment(page);
    await page.goto("/en/inventory/experiments", { waitUntil: "networkidle" });
    await expect(page.getByRole("list", { name: "Experiments" })).toBeVisible();

    await page.getByRole("link", { name: WORDS.en.table }).click();
    await expect(page).toHaveURL(/view=table/, { timeout: 20_000 });
    await expect(page.getByRole("table")).toBeVisible();
    const header = page.getByRole("columnheader", { name: /Name/ });
    await header.getByRole("link").click();
    await expect(page).toHaveURL(/sort=name/, { timeout: 20_000 });
    await expect(page.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
      "aria-sort",
      /ascending|descending/
    );
    await expect(page.getByRole("link", { name: WORDS.en.table })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  test("search treats % as a character, not a wildcard", async ({ page }) => {
    await signIn(page, "en");
    await page.goto("/en/inventory/experiments?q=%25zz", { waitUntil: "networkidle" });
    await expect(page.getByText(WORDS.en.noMatch)).toBeVisible();
  });

  test("an unknown or malformed experiment address is a not-found page, not an error", async ({
    page,
  }) => {
    await signIn(page, "en");
    for (const path of [
      "/en/inventory/experiments/999999999",
      "/en/inventory/experiments/99999999999",
      "/en/inventory/experiments/abc",
      "/en/inventory/experiments/999999999/labels",
    ]) {
      await page.goto(path, { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { name: WORDS.en.notFound }), path).toBeVisible();
    }
  });

  test("the wizard moves with the keyboard, checks each step and keeps its place", async ({
    page,
  }) => {
    const words = WORDS.en;
    await signIn(page, "en");
    await openWizard(page, "en");
    await expect(step(page, "en")).toContainText("Experiment");

    // Enter in the name field tries to move on: the empty name is refused and focused.
    await page.getByLabel(words.nameLabel).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByText(words.nameRequired)).toBeVisible();
    await expect(page.getByLabel(words.nameLabel)).toBeFocused();

    // A name, then Enter again: step 2, and focus moves to the step heading.
    await page.keyboard.type("E2E-keyboard");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 2, name: /Step 2 of 4/ })).toBeFocused();

    // The default unit group has no cultivar yet: the step is refused and the field is focused.
    await page.getByRole("button", { name: words.next, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator('[aria-invalid="true"]').first()).toBeFocused();

    // Back with the keyboard keeps what was typed.
    await page.getByRole("button", { name: words.back, exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByLabel(words.nameLabel)).toHaveValue("E2E-keyboard");

    // A reload restores the unfinished form from the session draft.
    await page.reload({ waitUntil: "networkidle" });
    await expect(page.getByText("Draft restored")).toBeVisible();
    await expect(page.getByLabel(words.nameLabel)).toHaveValue("E2E-keyboard");
    await page.getByRole("button", { name: "Start over" }).click();
    await expect(page.getByLabel(words.nameLabel)).toHaveValue("");
  });

  test("creates an experiment with starting units, a location and an internal source", async ({
    page,
  }) => {
    test.slow();
    await signIn(page, "en");
    await openWizard(page, "en");
    const name = `E2E-units-${Date.now()}`;
    await page.getByLabel(WORDS.en.nameLabel).fill(name);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    const cultivar = page.getByLabel(/^Cultivar/).first();
    const cultivars = await cultivar.locator("option").count();
    test.skip(cultivars < 2, "the development database has no cultivar to register units with");
    await cultivar.selectOption({ index: 1 });
    await page.getByLabel(/Number of plants/).fill("2");
    await expect(page.getByText(/2 units will be created/)).toBeVisible();
    await expectNoBlockingViolations(page);
    await page.getByRole("button", { name: "Next", exact: true }).click();

    const location = page.getByLabel(/^Location/);
    const locations = await location.locator("option").count();
    test.skip(locations < 2, "the development database has no active location");
    await location.selectOption({ index: 1 });
    await page
      .getByLabel(/Describe the internal source/)
      .fill("Internal stock for the end-to-end test");
    await expectNoBlockingViolations(page);
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await expect(page.getByText("2 units")).toBeVisible();
    await expectNoBlockingViolations(page);

    await page.getByRole("button", { name: "Create experiment", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/inventory\/experiments\/\d+\?created=1/, {
      timeout: 40_000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
    await expect(page.getByRole("link", { name: "Print their labels" })).toBeVisible();
    await page.getByRole("link", { name: "Print labels" }).first().click();
    await expect(page.getByText("2 labels")).toBeVisible({ timeout: 20_000 });
    await expectNoBlockingViolations(page);
  });

  for (const locale of ["en", "fr"] as const) {
    test(`${locale}: creates an experiment, then edits it and reads its record`, async ({
      page,
    }) => {
      test.slow();
      const words = WORDS[locale];
      const name = `E2E-${Date.now()}-${locale}`;
      await signIn(page, locale);
      await openWizard(page, locale);

      await page.getByLabel(words.nameLabel).fill(name);
      await page.getByRole("button", { name: words.next, exact: true }).click();
      await page.getByRole("button", { name: words.removeGroup }).click();
      await page.getByRole("button", { name: words.next, exact: true }).click();
      await page.getByRole("button", { name: words.next, exact: true }).click();
      await expect(page.getByText(name).first()).toBeVisible();

      await page.getByRole("button", { name: words.create }).click();
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/inventory/experiments/\\d+\\?created=1`),
        {
          timeout: 30_000,
        }
      );
      await expect(page.getByRole("heading", { level: 1 })).toContainText(name);
      await expect(page.getByText(words.created).first()).toBeVisible();

      await page.getByRole("button", { name: words.edit }).click();
      await page.getByLabel(/Notes|Notes et protocole/).fill("Written by the end-to-end test");
      await page.getByRole("button", { name: words.save }).click();
      await expect(page.getByText(words.updated).first()).toBeVisible();
      await expect(page.getByText("Written by the end-to-end test")).toBeVisible({
        timeout: 20_000,
      });

      const id = page.url().match(/experiments\/(\d+)/)?.[1];
      await page.goto(`/${locale}/inventory/experiments/${id}/labels`, {
        waitUntil: "networkidle",
      });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoBlockingViolations(page);
    });
  }
});
