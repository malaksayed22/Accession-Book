export type LocationCapacityInfo = {
  id: number;
  name: string;
  capacity: number | null;
  occupancy: number;
};

export function assessLocationCapacity(
  location: LocationCapacityInfo | null | undefined,
  incomingUnits: number
): { ok: boolean; message: string | null } {
  if (!location?.capacity || location.capacity <= 0) {
    return { ok: true, message: null };
  }
  const projected = location.occupancy + incomingUnits;
  if (projected <= location.capacity) {
    const remaining = location.capacity - projected;
    return {
      ok: true,
      message:
        remaining === 0
          ? `${location.name} will be at full capacity (${location.capacity} units).`
          : `${location.name}: ${projected}/${location.capacity} units after intake (${remaining} slots left).`,
    };
  }
  return {
    ok: false,
    message: `${location.name} capacity exceeded: ${projected} units planned but capacity is ${location.capacity} (currently ${location.occupancy} stored).`,
  };
}

// --- Display logic (no text: the UI translates the level) -------------------------------------

/** How full a location is. `unlimited` means no capacity is set, so there is nothing to compare. */
export type OccupancyLevel = "unlimited" | "ok" | "near" | "full" | "over";

/** From this share of the capacity a location is flagged as nearly full. */
export const NEAR_CAPACITY_RATIO = 0.9;

function hasLimit(capacity: number | null | undefined): capacity is number {
  return typeof capacity === "number" && capacity > 0;
}

export function occupancyLevel(units: number, capacity: number | null | undefined): OccupancyLevel {
  if (!hasLimit(capacity)) return "unlimited";
  if (units > capacity) return "over";
  if (units === capacity) return "full";
  return units / capacity >= NEAR_CAPACITY_RATIO ? "near" : "ok";
}

/** Whole-number percentage of the capacity in use (may exceed 100), or null without a limit. */
export function occupancyPercent(units: number, capacity: number | null | undefined) {
  return hasLimit(capacity) ? Math.round((units / capacity) * 100) : null;
}

/** A location can be retired only when no unit in inventory is stored there. */
export function canRetireLocation(unitsInside: number): boolean {
  return unitsInside === 0;
}
