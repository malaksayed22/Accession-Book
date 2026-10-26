/**
 * Where a unit stands, from its newest event and its active hold. One definition for every list
 * that shows it (the same words the unit list uses: in inventory, on hold, quarantine, shipped,
 * destroyed). Pure, so it is unit tested.
 */
export type UnitStanding = "active" | "on-hold" | "quarantine" | "shipped" | "destroyed";

export function unitStanding(
  stateKind: string | null | undefined,
  holdKind: string | null | undefined
): UnitStanding {
  if (stateKind === "DESTROYED") return "destroyed";
  if (stateKind === "SHIPPED") return "shipped";
  if (holdKind === "QUARANTINE") return "quarantine";
  if (holdKind) return "on-hold";
  return "active";
}

/** A unit that has left inventory can no longer be held, shipped or changed. */
export function isTerminalStanding(standing: UnitStanding): boolean {
  return standing === "shipped" || standing === "destroyed";
}
