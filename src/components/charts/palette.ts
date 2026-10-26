/**
 * Chart colours, straight from the design tokens so charts follow the light/dark theme. A gradient is
 * a pair of series colours (start, end). They are for marks only, never for text: every chart also
 * prints its figures.
 */
export type Gradient = readonly [from: string, to: string];

export const GRADIENTS = {
  indigo: ["var(--color-series-1)", "var(--color-series-4)"],
  ocean: ["var(--color-series-6)", "var(--color-series-1)"],
  mint: ["var(--color-series-3)", "var(--color-series-6)"],
  sunset: ["var(--color-series-5)", "var(--color-series-7)"],
  orchid: ["var(--color-series-4)", "var(--color-series-7)"],
} as const satisfies Record<string, Gradient>;

/** The order a chart with several unrelated series takes its colours in. */
export const CYCLE: readonly Gradient[] = [
  GRADIENTS.indigo,
  GRADIENTS.mint,
  GRADIENTS.sunset,
  GRADIENTS.ocean,
  GRADIENTS.orchid,
];

/** Meaning-bearing gradients (fine, caution, bad, unknown), always paired with a text label. */
export const STATUS = {
  good: ["var(--color-success-solid)", "var(--color-series-3)"],
  caution: ["var(--color-warning-solid)", "var(--color-series-5)"],
  bad: ["var(--color-danger-solid)", "var(--color-series-7)"],
  neutral: ["var(--color-series-2)", "var(--color-fg-tertiary)"],
} as const satisfies Record<string, Gradient>;

/** A soft light under a mark, in the mark's own end colour. */
export const glow = (color: string, strength = 45) =>
  `color-mix(in srgb, ${color} ${strength}%, transparent)`;
