/**
 * Pure status -> tone map behind StatusBadge. Kept free of React so it can be unit tested and
 * so the compiler forces every status to have a tone (`Record<Status, Tone>`).
 */
export const BADGE_TONES = ["neutral", "accent", "info", "success", "warning", "danger"] as const;
export type BadgeTone = (typeof BADGE_TONES)[number];

export const STATUSES = [
  "active",
  "on-hold",
  "quarantine",
  "shipped",
  "destroyed",
  "voided",
  "pending",
  "passed",
  "failed",
  "in-transit",
  "received",
  "draft",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_TONE: Record<Status, BadgeTone> = {
  active: "success",
  "on-hold": "warning",
  quarantine: "warning",
  shipped: "info",
  destroyed: "danger",
  voided: "neutral",
  pending: "neutral",
  passed: "success",
  failed: "danger",
  "in-transit": "accent",
  received: "success",
  draft: "neutral",
};
