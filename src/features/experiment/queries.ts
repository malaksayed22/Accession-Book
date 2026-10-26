import type { SessionUser } from "@/lib/auth";
import {
  cultivarById,
  daysAgo,
  EXPERIMENTS,
  experimentById,
  isActiveUnit,
  locationById,
  LOCATIONS,
  matches,
  memberById,
  MEMBERS,
  ORGANIZATIONS,
  CULTIVARS,
  slicePage,
  sortBy,
  SHIPMENTS,
  organizationById,
  INCIDENTS,
  unitById,
  UNITS,
  AUDIT_ACTIONS,
  type MockUnit,
} from "@/features/mock/data";
import type { ExperimentStatus } from "./dates";
import { suggestedKindForUnitType, type IntakeKindId } from "@/lib/experiment-intake";

export const EXPERIMENT_LIST_SORTS = ["date", "end", "name", "code", "units"] as const;
export const EXPERIMENT_LIST_STATUSES = ["running", "completed"] as const;
export const EXPERIMENT_UNIT_SORTS = ["name", "type", "cultivar", "location", "date"] as const;
export const EXPERIMENT_UNIT_STATUSES = ["active", "hold", "shipped", "destroyed"] as const;

type UnitType = MockUnit["type"];

export type ExperimentListRow = {
  id: number;
  ecode: string;
  name: string;
  comment: string | null;
  status: ExperimentStatus;
  startDate: Date;
  endDate: Date | null;
  unitCount: number;
  parent: { id: number; ecode: string } | null;
  members: Array<{ id: number; name: string; role: "LEAD" | "MEMBER" }>;
  stats: {
    inventory: number;
    onHold: number;
    types: Array<{ type: UnitType; count: number }>;
    locations: Array<{ id: number; name: string }>;
  };
};

const statusOf = (endDate: Date | null): ExperimentStatus =>
  !endDate || endDate.getTime() >= Date.now() ? "active" : "completed";

const toRow = (e: (typeof EXPERIMENTS)[number]): ExperimentListRow => {
  const units = UNITS.filter((u) => u.experimentId === e.id);
  const active = units.filter(isActiveUnit);
  const parent = experimentById(e.parentId);
  const typeCounts = new Map<UnitType, number>();
  for (const u of active) typeCounts.set(u.type, (typeCounts.get(u.type) ?? 0) + 1);
  const locs = new Map<number, string>();
  for (const u of active) {
    const l = locationById(u.locationId);
    if (l) locs.set(l.id, l.name);
  }
  return {
    id: e.id,
    ecode: e.ecode,
    name: e.name,
    comment: e.comment,
    status: statusOf(e.endDate),
    startDate: e.startDate,
    endDate: e.endDate,
    unitCount: units.length,
    parent: parent ? { id: parent.id, ecode: parent.ecode } : null,
    members: e.memberIds.map((id) => ({
      id,
      name: memberById(id).name,
      role: id === e.leadId ? ("LEAD" as const) : ("MEMBER" as const),
    })),
    stats: {
      inventory: active.length,
      onHold: active.filter((u) => u.status === "on-hold" || u.status === "quarantine").length,
      types: [...typeCounts.entries()].map(([type, count]) => ({ type, count })),
      locations: [...locs.entries()].map(([id, name]) => ({ id, name })),
    },
  };
};

export async function listExperiments(
  user: SessionUser,
  f: {
    q?: string;
    status?: (typeof EXPERIMENT_LIST_STATUSES)[number];
    mine: boolean;
    sort: (typeof EXPERIMENT_LIST_SORTS)[number];
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  let rows = EXPERIMENTS.map(toRow).filter(
    (e) =>
      matches(f.q, e.ecode, e.name) &&
      (!f.status || (f.status === "running" ? e.status === "active" : e.status === "completed")) &&
      (!f.mine || e.members.some((m) => m.id === user.id))
  );
  const key = {
    date: (e: ExperimentListRow) => e.startDate,
    end: (e: ExperimentListRow) => e.endDate,
    name: (e: ExperimentListRow) => e.name.toLowerCase(),
    code: (e: ExperimentListRow) => e.ecode,
    units: (e: ExperimentListRow) => e.unitCount,
  }[f.sort];
  rows = sortBy(rows, key, f.order);
  return { rows: slicePage(rows, f.page, f.limit), total: rows.length };
}

export type ExperimentUnitRow = {
  id: number;
  name: string;
  type: UnitType;
  cultivarId: number | null;
  cultivarName: string | null;
  locationId: number | null;
  locationName: string | null;
  lastUpdated: Date;
  status: MockUnit["status"];
};

const toUnitRow = (u: MockUnit): ExperimentUnitRow => ({
  id: u.id,
  name: u.name,
  type: u.type,
  cultivarId: u.cultivarId,
  cultivarName: cultivarById(u.cultivarId)?.name ?? null,
  locationId: u.locationId,
  locationName: locationById(u.locationId)?.name ?? null,
  lastUpdated: daysAgo(u.updatedDaysAgo),
  status: u.status,
});

export async function listExperimentUnits(
  _user: SessionUser,
  experimentId: number,
  f: {
    status?: (typeof EXPERIMENT_UNIT_STATUSES)[number];
    sort: (typeof EXPERIMENT_UNIT_SORTS)[number];
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  let rows = UNITS.filter((u) => u.experimentId === experimentId)
    .map(toUnitRow)
    .filter((u) => {
      if (!f.status) return true;
      if (f.status === "active") return u.status !== "shipped" && u.status !== "destroyed";
      if (f.status === "hold") return u.status === "on-hold" || u.status === "quarantine";
      return u.status === f.status;
    });
  const key = {
    name: (u: ExperimentUnitRow) => u.name.toLowerCase(),
    type: (u: ExperimentUnitRow) => u.type,
    cultivar: (u: ExperimentUnitRow) => u.cultivarName,
    location: (u: ExperimentUnitRow) => u.locationName,
    date: (u: ExperimentUnitRow) => u.lastUpdated,
  }[f.sort];
  rows = sortBy(rows, key, f.order);
  return { rows: slicePage(rows, f.page, f.limit), total: rows.length };
}

export async function getExperimentDetail(user: SessionUser, id: number) {
  const e = experimentById(id);
  if (!e) return null;
  const row = toRow(e);
  const units = UNITS.filter((u) => u.experimentId === id);
  const groupMap = new Map<
    string,
    {
      type: UnitType;
      cultivarId: number | null;
      cultivarName: string | null;
      inventory: number;
      total: number;
    }
  >();
  for (const u of units) {
    const key = `${u.type}:${u.cultivarId ?? "none"}`;
    const g = groupMap.get(key) ?? {
      type: u.type,
      cultivarId: u.cultivarId,
      cultivarName: cultivarById(u.cultivarId)?.name ?? null,
      inventory: 0,
      total: 0,
    };
    g.total += 1;
    if (isActiveUnit(u)) g.inventory += 1;
    groupMap.set(key, g);
  }
  const locCounts = new Map<number, { name: string; count: number }>();
  for (const u of units.filter(isActiveUnit)) {
    const location = locationById(u.locationId);
    if (location) {
      const seen = locCounts.get(location.id);
      locCounts.set(location.id, { name: location.name, count: (seen?.count ?? 0) + 1 });
    }
  }
  const receipts = SHIPMENTS.filter(
    (s) => s.direction === "INBOUND" && s.units.some((uid) => unitById(uid)?.experimentId === id)
  );
  const parent = experimentById(e.parentId);
  const sourceUnit = id === 2 ? unitById(1) : null;
  const audit = AUDIT_ACTIONS.filter((a) => a.entityType === "experiment" && a.entityId === id);

  return {
    id: e.id,
    ecode: e.ecode,
    name: e.name,
    comment: e.comment,
    status: row.status,
    startDate: e.startDate,
    endDate: e.endDate,
    createdAt: new Date(e.startDate.getTime() - 3 * 86_400_000),
    canEdit: user.permissions === "ADMIN" || e.memberIds.includes(user.id),
    canManageMembers: user.permissions === "ADMIN",
    canViewAudit: user.permissions === "ADMIN",
    counts: {
      total: units.length,
      inventory: units.filter(isActiveUnit).length,
      onHold: units.filter((u) => u.status === "on-hold" || u.status === "quarantine").length,
      shipped: units.filter((u) => u.status === "shipped").length,
      destroyed: units.filter((u) => u.status === "destroyed").length,
    },
    members: e.memberIds.map((uid) => ({
      userId: uid,
      name: memberById(uid).name,
      role: uid === e.leadId ? ("LEAD" as const) : ("MEMBER" as const),
    })),
    availableUsers: MEMBERS.filter((m) => m.status === "active" && !e.memberIds.includes(m.id)).map(
      (m) => ({ id: m.id, name: m.name })
    ),
    groups: [...groupMap.values()],
    locations: [...locCounts.entries()].map(([id, { name, count }]) => ({ id, name, count })),
    parent: parent ? { id: parent.id, ecode: parent.ecode, name: parent.name } : null,
    sourceUnit: sourceUnit ? { id: sourceUnit.id, name: sourceUnit.name } : null,
    children: EXPERIMENTS.filter((c) => c.parentId === id).map((c) => ({
      id: c.id,
      ecode: c.ecode,
      name: c.name,
      status: statusOf(c.endDate),
    })),
    provenance: [
      {
        sourceType: "RECEIVED" as const,
        units: Math.max(1, units.length - 2),
        provider: organizationById(1) && { id: 1, name: ORGANIZATIONS[0]!.name },
        description: "Clones from the spring intake batch.",
      },
      { sourceType: "INTERNAL" as const, units: 2, provider: null, description: null },
    ],
    receipts: receipts.map((s) => ({
      id: s.id,
      reference: s.reference,
      status: s.status,
      organization: { id: s.organizationId, name: organizationById(s.organizationId)!.name },
      deliveredDate: s.status === "DELIVERED" ? daysAgo(s.daysAgo) : null,
      lines: s.units.length,
      manifestNumber: s.manifest,
    })),
    activity: {
      unitEvents: units.length * 4,
      fieldRecords: units.length * 2,
      openIncidents: INCIDENTS.filter(
        (i) => i.status !== "CLOSED" && units.some((u) => u.id === i.unitId)
      ).length,
      lastUnitEventAt: units.length
        ? daysAgo(Math.min(...units.map((u) => u.updatedDaysAgo)))
        : null,
      recent: audit.map((a, index) => ({
        id: index + 1,
        summary: a.summary,
        userId: a.actor,
        userName: memberById(a.actor).name,
        at: daysAgo(a.daysAgo),
      })),
    },
  };
}
export type ExperimentDetail = NonNullable<Awaited<ReturnType<typeof getExperimentDetail>>>;

export async function getExperimentLabels(_user: SessionUser, id: number) {
  const e = experimentById(id);
  if (!e) return null;
  const units = UNITS.filter((u) => u.experimentId === id && isActiveUnit(u));
  return {
    experiment: { id: e.id, ecode: e.ecode, name: e.name },
    units: units.map((u) => ({
      unitId: u.id,
      name: u.name,
      type: u.type,
      cultivarName: cultivarById(u.cultivarId)?.name ?? null,
    })),
    omitted: 0,
    baseUrl: "http://localhost:3000",
  };
}

export type WizardOptions = {
  user: { id: number; name: string; admin: boolean };
  users: Array<{ id: number; name: string }>;
  codePrefix: string;
  suggestedCode: string;
  parent: { id: number; ecode: string; name: string } | null;
  parentProblem: "missing" | "forbidden" | null;
  parentOptions: Array<{ id: number; ecode: string; name: string }>;
  sourceUnit: {
    id: number;
    name: string;
    cultivarId: number | null;
    cultivarName: string | null;
    locationId: number | null;
    locationName: string | null;
    growthStage: string | null;
    suggestedKind: IntakeKindId;
    providerMode: "INTERNAL" | "EXTERNAL";
    providerOrganizationId: number | null;
    providerOrganizationName: string | null;
    sourceDescription: string | null;
  } | null;
  cultivars: Array<{ id: number; name: string }>;
  locations: Array<{ id: number; name: string; capacity: number | null; occupancy: number }>;
  organizations: Array<{ id: number; name: string }>;
};

export async function getExperimentWizardOptions(
  user: SessionUser,
  ctx: { parentId?: number; sourceUnitId?: number }
): Promise<WizardOptions> {
  const parent = experimentById(ctx.parentId ?? null);
  const unit = ctx.sourceUnitId ? unitById(ctx.sourceUnitId) : null;
  return {
    user: { id: user.id, name: user.name, admin: user.permissions === "ADMIN" },
    users: MEMBERS.filter((m) => m.status === "active" && m.id !== user.id).map((m) => ({
      id: m.id,
      name: m.name,
    })),
    codePrefix: "EXP-2026",
    suggestedCode: "EXP-2026-005",
    parent: parent ? { id: parent.id, ecode: parent.ecode, name: parent.name } : null,
    parentProblem: null,
    parentOptions: EXPERIMENTS.map((e) => ({ id: e.id, ecode: e.ecode, name: e.name })),
    sourceUnit: unit
      ? {
          id: unit.id,
          name: unit.name,
          cultivarId: unit.cultivarId,
          cultivarName: cultivarById(unit.cultivarId)?.name ?? null,
          locationId: unit.locationId,
          locationName: locationById(unit.locationId)?.name ?? null,
          growthStage: unit.stage,
          suggestedKind: suggestedKindForUnitType(unit.type),
          providerMode: "INTERNAL",
          providerOrganizationId: null,
          providerOrganizationName: null,
          sourceDescription: null,
        }
      : null,
    cultivars: CULTIVARS.map((c) => ({ id: c.id, name: c.name })),
    locations: LOCATIONS.filter((l) => l.active).map((l) => ({
      id: l.id,
      name: l.name,
      capacity: l.capacity,
      occupancy: UNITS.filter((u) => u.locationId === l.id && isActiveUnit(u)).length,
    })),
    organizations: ORGANIZATIONS.map((o) => ({ id: o.id, name: o.name })),
  };
}
