import type { SessionUser } from "@/lib/auth";
import {
  CULTIVARS,
  cultivarById,
  daysAgo,
  experimentById,
  INCIDENTS,
  isActiveUnit,
  locationById,
  matches,
  organizationById,
  slicePage,
  sortBy,
  TESTS,
  unitById,
  UNITS,
  type MockUnit,
} from "@/features/mock/data";
import type { TestPanel } from "@/generated/prisma/enums";

export const CULTIVAR_LIST_SORTS = ["name", "units", "thc", "updated"] as const;
export type CultivarListSort = (typeof CULTIVAR_LIST_SORTS)[number];
export const CULTIVAR_LIST_USAGE = ["used", "unused"] as const;
export const CULTIVAR_UNIT_SORTS = ["name", "type", "experiment", "location"] as const;

export type CultivarListRow = {
  id: number;
  name: string;
  code: string | null;
  commonName: string | null;
  category: string | null;
  targetThc: number | null;
  targetCbd: number | null;
  comment: string | null;
  updatedAt: Date;
  stats: {
    totalUnits: number;
    activeUnits: number;
    onHold: number;
    experiments: number;
    locations: number;
  };
};

const statsFor = (cultivarId: number) => {
  const units = UNITS.filter((u) => u.cultivarId === cultivarId);
  const active = units.filter(isActiveUnit);
  return {
    totalUnits: units.length,
    activeUnits: active.length,
    onHold: active.filter((u) => u.status === "on-hold" || u.status === "quarantine").length,
    experiments: new Set(units.map((u) => u.experimentId).filter(Boolean)).size,
    locations: new Set(active.map((u) => u.locationId).filter(Boolean)).size,
  };
};

const toRow = (c: (typeof CULTIVARS)[number]): CultivarListRow => ({
  ...c,
  updatedAt: daysAgo(c.id * 3),
  stats: statsFor(c.id),
});

export async function listCultivars(
  _user: SessionUser,
  f: {
    q?: string;
    usage?: (typeof CULTIVAR_LIST_USAGE)[number];
    sort: CultivarListSort;
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  let rows = CULTIVARS.map(toRow).filter(
    (c) =>
      matches(f.q, c.name, c.code, c.commonName, c.category) &&
      (!f.usage || (f.usage === "used" ? c.stats.totalUnits > 0 : c.stats.totalUnits === 0))
  );
  const key = {
    name: (c: CultivarListRow) => c.name.toLowerCase(),
    units: (c: CultivarListRow) => c.stats.activeUnits,
    thc: (c: CultivarListRow) => c.targetThc,
    updated: (c: CultivarListRow) => c.updatedAt,
  }[f.sort];
  rows = sortBy(rows, key, f.order);
  return { rows: slicePage(rows, f.page, f.limit), total: rows.length };
}

export async function getCultivar(_user: SessionUser, id: number): Promise<CultivarListRow | null> {
  const c = cultivarById(id);
  return c ? toRow(c) : null;
}

export type CultivarUnitRow = {
  id: number;
  name: string;
  type: MockUnit["type"];
  experiment: { id: number; ecode: string } | null;
  locationId: number | null;
  locationName: string | null;
  status: MockUnit["status"];
};

export async function listCultivarUnits(
  _user: SessionUser,
  cultivarId: number,
  f: {
    sort: (typeof CULTIVAR_UNIT_SORTS)[number];
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  let rows: CultivarUnitRow[] = UNITS.filter((u) => u.cultivarId === cultivarId).map((u) => {
    const e = experimentById(u.experimentId);
    return {
      id: u.id,
      name: u.name,
      type: u.type,
      experiment: e ? { id: e.id, ecode: e.ecode } : null,
      locationId: u.locationId,
      locationName: locationById(u.locationId)?.name ?? null,
      status: u.status,
    };
  });
  const key = {
    name: (u: CultivarUnitRow) => u.name.toLowerCase(),
    type: (u: CultivarUnitRow) => u.type,
    experiment: (u: CultivarUnitRow) => u.experiment?.ecode ?? null,
    location: (u: CultivarUnitRow) => u.locationName,
  }[f.sort];
  rows = sortBy(rows, key, f.order);
  return { rows: slicePage(rows, f.page, f.limit), total: rows.length };
}

export type CultivarIncidentRow = {
  id: number;
  title: string;
  unit: { id: number; name: string } | null;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  status: "OPEN" | "INVESTIGATING" | "CLOSED";
  createdAt: Date;
};
export type CultivarTestRow = {
  id: number;
  unit: { id: number; name: string };
  lab: { id: number; name: string } | null;
  panel: TestPanel;
  analyte: string;
  value: number | null;
  uom: string | null;
  verdict: "PASS" | "FAIL" | "INCONCLUSIVE" | "RECORDED";
  testedAt: Date;
};

export async function listCultivarIncidents(_user: SessionUser, cultivarId: number) {
  const rows: CultivarIncidentRow[] = INCIDENTS.filter(
    (i) => unitById(i.unitId)?.cultivarId === cultivarId
  ).map((i) => ({
    id: i.id,
    title: i.title,
    unit: unitById(i.unitId) ? { id: i.unitId, name: unitById(i.unitId)!.name } : null,
    severity: i.severity,
    status: i.status,
    createdAt: daysAgo(i.createdDaysAgo),
  }));
  return { rows, total: rows.length };
}

export async function listCultivarTests(_user: SessionUser, cultivarId: number) {
  const rows: CultivarTestRow[] = TESTS.filter(
    (t) => unitById(t.unitId)?.cultivarId === cultivarId
  ).map((t) => ({
    id: t.id,
    unit: { id: t.unitId, name: unitById(t.unitId)!.name },
    lab: organizationById(t.labId) ? { id: t.labId, name: organizationById(t.labId)!.name } : null,
    panel: t.panel,
    analyte: t.analyte,
    value: t.value,
    uom: t.uom,
    verdict: t.verdict,
    testedAt: daysAgo(t.daysAgo),
  }));
  return { rows, total: rows.length };
}
