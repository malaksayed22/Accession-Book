# Design system

Calm, dense, and legible: a tool people use for hours to keep records that regulators read. The app shares the public
site's look: deep navy and ink, hairline borders instead of shadows, mono kickers, pill buttons, one italic serif accent
word per headline, and a little motion that stops under `prefers-reduced-motion`.

## Tokens (`src/styles/tokens.css`)

- One semantic palette, light and dark. **Components never use raw colours.** Tailwind utilities exist for every token:
  `bg-bg`, `bg-surface`, `bg-raised`, `bg-sunken`, `bg-hover`, `border-border`, `border-border-input`, `text-fg`,
  `text-fg-secondary`, `text-fg-tertiary`, `bg-accent`, `text-on-accent`, `text-accent-text`, `bg-accent-soft`, and for
  `success|warning|danger|info`: `text-<s>`, `bg-<s>-soft`, `border-<s>-soft-border`.
- **Contrast is a test** (`src/styles/tokens.test.ts`): every text/surface pair is checked against WCAG 2.2 AA (4.5:1 text,
  3:1 for control borders and the focus ring) in both themes, parsed from the CSS so it cannot drift. Change a colour,
  run the test.
- `prefers-contrast: more` strengthens borders and tertiary text. `prefers-reduced-motion` is honoured globally.
- The pre-P4 colour aliases and the unlayered legacy stylesheet were deleted in P5; only tokens remain.

## Theme

`light`, `dark` or `system`, stored in the `ab_theme` cookie. The server writes `<html data-theme>` on the first byte, so
there is no flash and no inline script (which the CSP would otherwise need). `system` leaves the attribute off and
`prefers-color-scheme` decides.

## Primitives (`src/components/ui`, gallery at `/en/dev/ui`, development only)

Button, IconButton, Field + Input/Textarea/Select/Checkbox, Badge, StatusBadge, Panel, PageHeader, Breadcrumbs, Banner,
Tabs, DropdownMenu, Dialog, Sheet, ConfirmDialog (typed phrase and reason for irreversible actions), Toast, Skeleton,
EmptyState, LockedState, DataTable + SortHeader + Pagination + FilterChips (state lives in the URL).

Rules every primitive follows: native elements first; visible focus; status is never colour alone (icon and text);
errors are announced through a live region; 44 px touch targets on coarse pointers; all built-in text comes from
`messages/*/ui.json`; layouts wrap instead of truncating so French (about 30 % longer) fits. `Radix` supplies focus
trapping, Escape handling and focus restore for overlays. A Playwright spec (`e2e/ui-primitives.spec.ts`) runs axe on the
gallery in English and French, light and dark.

## Shell and navigation (`src/components/shell`)

Five hubs, defined once in `nav-config.ts`: Dashboard, Inventory, Quality, Records, Compliance. A hub owns a URL prefix
(`/inventory/...`). The sidebar lists every page, grouped under its hub heading, so nothing sits behind a second row of tabs:

```
/dashboard
/inventory   units  experiments  materials  destroyed        (/inventory forwards to /inventory/units)
/quality     holds & tests (/quality)  recall (/quality/recall)
/records     cultivars  locations  organizations  members    (/records forwards to /records/cultivars)
/compliance  console (/compliance)  reports  audit           (reports and audit are administrators only)
```

- The shell is a left sidebar (`Sidebar`, `SidebarNav`, `SidebarTools`, `SidebarAccount`): brand with two quiet icon buttons
  (language menu, light/dark) and search (Ctrl/⌘+K) at the top, every page in the middle, and the signed-in user (a link to
  `/profile`) with sign out at the bottom. The page list scrolls without a scrollbar and fades out at its bottom edge while
  there is more. Below `lg` it becomes a drawer opened from a slim top bar (language and theme then sit under the account).
  Width is `--sidebar-width` in `tokens.css`.
- Pages are plain links with their own URL, `loading.tsx` and history entry. The current page is highlighted and carries
  `aria-current` (`page` on the page itself, `true` on a record inside it).
- Pages below a tab (a record, "new", labels) pass `<HubCrumbs tab="units" current={name} />` to `PageHeader`, which gives
  "Inventory / Units / BD-001" with the record's real name. Labels live in `messages/*/shell.json` (`nav.hubs`, `nav.tabs`).
- `template.tsx` in each hub eases the page in (`.page-in`); the sidebar does not move.
- The old top-level addresses (`/units`, `/qa`, `/overview`, ...) are forwarded with their sub-path and query by
  `redirects()` in `next.config.ts`, so printed QR codes and bookmarks keep working. Add a hub's new pages there only if
  they replace an older address.
- `e2e/shell.spec.ts` covers the hubs, tabs, forwarding, keyboard operation, the drawer, language and theme persistence
  and axe on the shell.

## Look and feel

- Page titles use `PageHeader` (3xl to 4xl, tight tracking); `kicker` adds the mono line above it. Dashboard and the sign-in
  panel use one italic serif word (`font-serif italic`).
- Few shapes. Buttons and icon buttons are `rounded-lg`; panels and cards are `rounded-xl` with a hairline border and no
  shadow; badges are square-cornered tints, and `StatusBadge` is just a coloured icon and text. Tables have no box, only
  hairlines. Empty and locked states show a plain icon, not a tile.
- List pages put their whole toolbar in `FilterBar` (`components/page`), with no panel around it: a hairline search box
  (`SearchForm`, `RegisterSearchForm`) and its controls (`SelectFilter`, `ViewModeToggle`) on one row, then the filter
  groups centred below. Each `FilterChips` group is a quiet text trigger ("Status ⌄") that opens a short list of
  links (Radix menu). The chosen option is named on the trigger, which is underlined, and marked with a check and
  `aria-current` in the list; "Clear all" sits at the foot of the first group's list. A group with one option is a toggle link.
- Search is live. `LiveForm` (client) updates the URL about 250 ms after typing stops, at once for selects, and resets the
  page number; the URL stays the state and the form still works as a plain GET form without JavaScript. Do not add a
  Search button. Use `<Input variant="line">` / `<Select variant="line">` for toolbar fields and `variant="box"` (default) in forms.
- `StatCard` shows a large tabular number and a small tone dot (never colour alone); `index` staggers a row (`.rise`).
- `DataTable` is a table from `md` up and a list of cards below it; its header is small mono capitals.
- Loading uses `PageSkeleton` (`variant="table"` or `"cards"`) in each hub's `loading.tsx`; the shimmer is `.skeleton`.
- `.scope-dark` paints one region in the dark palette whatever the theme is (the sign-in artwork).

## Adding or rebuilding a page (P5 checklist)

1. Put text in `messages/<locale>/<area>.json`, both languages; `useTranslations`/`getTranslations`, never literals.
2. Build with the primitives; no raw colours; no new unlayered CSS.
3. Call `requirePageUser()` first; read data through `features/*/queries.ts`.
4. Add the file to the `i18next/no-literal-string` list in `eslint.config.mjs`.
5. Add an axe check for both languages and both themes.

## Charts (`src/components/charts`)

`AreaChart` (smooth gradient area, hover read-out), `DonutChart` (rounded gradient segments, linked legend), `GaugeChart`
(open ring) and `BarChart` (horizontal, optional per-row capacity) are plain SVG/HTML: no chart library. Colours are
gradient pairs from `palette.ts`, built from the `series-*` and status tokens, so they follow the theme; `.chart-glow` adds the
soft corner light on a panel. A chart is never the only carrier of a figure: legends and rows print every name, count and
share, and `AreaChart` carries a hidden table. Lines draw and rings sweep with `.draw-line` / `.ring-in` / `.grow-x`, which
the global reduced-motion rule switches off. The dashboard shows them first.
