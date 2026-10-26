import type { SessionUser } from "@/lib/auth";
import { isActiveUnit, LOCATIONS, matches, slicePage, sortBy, UNITS } from "@/features/mock/data";

export const LOCATION_LIST_SORTS = ["name", "units", "capacity"] as const;
export const LOCATION_LIST_STATUSES = ["active", "retired"] as const;

export type LocationListRow = {
  id: number;
  name: string;
  address: string | null;
  comment: string | null;
  capacity: number | null;
  active: boolean;
  units: number;
  experiments: number;
};

const toRow = (l: (typeof LOCATIONS)[number]): LocationListRow => {
  const here = UNITS.filter((u) => u.locationId === l.id && isActiveUnit(u));
  return {
    id: l.id,
    name: l.name,
    address: l.address,
    comment: l.comment,
    capacity: l.capacity,
    active: l.active,
    units: here.length,
    experiments: new Set(here.map((u) => u.experimentId).filter(Boolean)).size,
  };
};

export async function listLocations(
  _user: SessionUser,
  f: {
    q?: string;
    status?: (typeof LOCATION_LIST_STATUSES)[number];
    sort: (typeof LOCATION_LIST_SORTS)[number];
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  let rows = LOCATIONS.map(toRow).filter(
    (l) =>
      matches(f.q, l.name, l.address) &&
      (!f.status || (f.status === "active" ? l.active : !l.active))
  );
  const key = {
    name: (l: LocationListRow) => l.name.toLowerCase(),
    units: (l: LocationListRow) => l.units,
    capacity: (l: LocationListRow) => l.capacity,
  }[f.sort];
  rows = sortBy(rows, key, f.order);
  return { rows: slicePage(rows, f.page, f.limit), total: rows.length };
}

export async function getLocationOverview(_user: SessionUser) {
  const rows = LOCATIONS.map(toRow);
  return {
    active: rows.filter((l) => l.active).length,
    retired: rows.filter((l) => !l.active).length,
    unitsStored: rows.reduce((sum, l) => sum + l.units, 0),
    atCapacity: rows.filter((l) => l.capacity !== null && l.units >= l.capacity).length,
  };
}
