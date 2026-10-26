/**
 * Rules for editing an experiment's details, shared by the edit panel and its unit tests. They match
 * `updateExperimentSchema` and `updateExperiment` on the server (which stays the authority); the
 * start date is read-only after creation, so it only appears here as the lower bound of the end date.
 */
export const EXPERIMENT_NAME_MAX = 200;
export const EXPERIMENT_NOTES_MAX = 2000;

export type EditField = "name" | "endDate" | "comment";
export type EditIssueCode =
  "name_required" | "name_too_long" | "end_invalid" | "end_before_start" | "comment_too_long";

export type EditDraft = { name: string; endDate: string; comment: string };

const isCalendarDay = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());

export function validateEdit(
  draft: EditDraft,
  startDate: string
): Partial<Record<EditField, EditIssueCode>> {
  const issues: Partial<Record<EditField, EditIssueCode>> = {};
  const name = draft.name.trim();
  if (!name) issues.name = "name_required";
  else if (name.length > EXPERIMENT_NAME_MAX) issues.name = "name_too_long";

  // The end date may stay empty (older records have none); when given it must be a day on or after the start.
  if (draft.endDate) {
    if (!isCalendarDay(draft.endDate)) issues.endDate = "end_invalid";
    else if (startDate && draft.endDate < startDate) issues.endDate = "end_before_start";
  }

  if (draft.comment.trim().length > EXPERIMENT_NOTES_MAX) issues.comment = "comment_too_long";
  return issues;
}
