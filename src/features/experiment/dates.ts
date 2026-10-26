export type ExperimentStatus = "active" | "completed";

/** Experiment dates are calendar days: format them in UTC so they never shift. */
export const CALENDAR_DAY_FORMAT = {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
} as const;

/** `YYYY-MM-DD` for a date input. */
export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}
