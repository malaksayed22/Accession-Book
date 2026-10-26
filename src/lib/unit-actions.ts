import type { UnitType } from "@/generated/prisma/enums";
import type { TerminalKind } from "./unit-profile";

/**
 * What the unit page offers, as one pure function. This only decides what to SHOW: the server
 * enforces every rule again (`features/unit/service.ts`, `features/qa/service.ts`), so a stale page
 * can never do more than the rules allow.
 *
 * An action is `hidden` when the user may never do it here (no permission, or it does not apply to
 * this type of unit), `blocked` when they could but the unit's state forbids it right now (the UI
 * says why), and `allowed` otherwise.
 */
export const UNIT_ACTIONS = [
  "move",
  "stage",
  "measure",
  "derive",
  "edit",
  "linkParent",
  "hold",
  "releaseHold",
  "destroy",
  "recordTest",
  "reportIncident",
  "recordActivity",
  "upload",
] as const;
export type UnitActionId = (typeof UNIT_ACTIONS)[number];

/** Why a visible action cannot be used now. Translated as `units.detail.blocked.<reason>`. */
export type BlockedReason = "held" | "destroyed" | "shipped";

export type ActionAvailability =
  { status: "allowed" } | { status: "hidden" } | { status: "blocked"; reason: BlockedReason };

export type UnitActionContext = {
  type: UnitType;
  terminal: TerminalKind | null;
  onHold: boolean;
  hasParent: boolean;
  /** Admin, or a member of the unit's experiment. */
  canEdit: boolean;
  isAdmin: boolean;
};

const ALLOWED: ActionAvailability = { status: "allowed" };
const HIDDEN: ActionAvailability = { status: "hidden" };

function blockedByTerminal(terminal: TerminalKind): ActionAvailability {
  return { status: "blocked", reason: terminal === "DESTROYED" ? "destroyed" : "shipped" };
}

/** Actions that change the unit's custody or lifecycle: a hold freezes them. */
const FROZEN_BY_HOLD: ReadonlySet<UnitActionId> = new Set(["move", "stage", "derive", "destroy"]);

function appliesToType(action: UnitActionId, type: UnitType): boolean {
  switch (action) {
    case "stage":
      return type === "PLANT" || type === "FLOWER";
    case "measure":
      return type !== "CULTURE";
    case "derive":
      return type === "PLANT" || type === "CULTURE";
    default:
      return true;
  }
}

export function availabilityOf(
  action: UnitActionId,
  context: UnitActionContext
): ActionAvailability {
  if (action === "releaseHold") {
    // A quality decision: admins only, and only while a hold exists.
    return context.isAdmin && context.onHold ? ALLOWED : HIDDEN;
  }
  if (action === "edit" && context.terminal === "DESTROYED") {
    // The one edit after destruction: notes, by an admin.
    return context.isAdmin ? ALLOWED : HIDDEN;
  }
  if (!context.canEdit || !appliesToType(action, context.type)) return HIDDEN;
  if (action === "linkParent" && context.hasParent) return HIDDEN;
  if (action === "hold" && context.onHold) return HIDDEN;
  if (context.terminal) return blockedByTerminal(context.terminal);
  if (context.onHold && FROZEN_BY_HOLD.has(action)) return { status: "blocked", reason: "held" };
  return ALLOWED;
}

export function availabilityMap(
  context: UnitActionContext
): Record<UnitActionId, ActionAvailability> {
  return Object.fromEntries(UNIT_ACTIONS.map((a) => [a, availabilityOf(a, context)])) as Record<
    UnitActionId,
    ActionAvailability
  >;
}
