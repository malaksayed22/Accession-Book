import type { SessionUser } from "@/lib/auth";
import {
  cultivarById,
  daysAgo,
  experimentById,
  HOLDS,
  INCIDENTS,
  isActiveUnit,
  locationById,
  matches,
  memberById,
  organizationById,
  SHIPMENTS,
  slicePage,
  sortBy,
  TESTS,
  unitById,
  UNITS,
  type MockUnit,
  type MockVerdict,
} from "@/features/mock/data";
import type { TestPanel } from "@/generated/prisma/enums";

export const QA_VIEWS = ["overview", "holds", "tests", "incidents"] as const;
export type QaView = (typeof QA_VIEWS)[number];
export const QA_HOLD_KINDS = ["HOLD", "QUARANTINE"] as const;
export const QA_TEST_VERDICTS = ["PASS", "FAIL", "INCONCLUSIVE", "RECORDED"] as const;
export const QA_SEVERITIES = ["CRITICAL", "MAJOR", "MINOR"] as const;
export const QA_SORTS = {
  overview: [] as readonly string[],
  holds: ["unit", "kind", "age"] as readonly string[],
  tests: ["unit", "panel", "verdict", "date"] as readonly string[],
  incidents: ["title", "severity", "status", "date"] as readonly string[],
};

type UnitRef = { id: number; name: string; type: MockUnit["type"] };
const unitRef = (id: number): UnitRef => {
  const u = unitById(id)!;
  return { id: u.id, name: u.name, type: u.type };
};

export type QaHoldRow = {
  id: number;
  /** Same as `id`; the page keys its rows by it. */
  holdId: number;
  unit: UnitRef;
  kind: "HOLD" | "QUARANTINE";
  origin: "MANUAL" | "AUTO_TEST" | "AUTO_INCIDENT";
  reason: string;
  locationId: number | null;
  locationName: string | null;
  placedAt: Date;
  placedBy: string;
  placedById: number;
  ageDays: number;
};
export type QaTestRow = {
  id: number;
  unit: UnitRef;
  panel: TestPanel;
  analyte: string;
  value: number | null;
  uom: string | null;
  limitMin: number | null;
  limitMax: number | null;
  verdict: MockVerdict;
  labId: number | null;
  labName: string | null;
  testedAt: Date;
  recordedBy: { id: number; name: string };
};
export type QaIncidentRow = {
  id: number;
  title: string;
  description: string | null;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  status: "OPEN" | "INVESTIGATING" | "CLOSED";
  resolution: string | null;
  unit: UnitRef | null;
  cultivar: { id: number; name: string } | null;
  experiment: { id: number; ecode: string } | null;
  createdAt: Date;
  openedBy: string;
  openedById: number;
};

const holdRows = (): QaHoldRow[] =>
  HOLDS.map((h) => {
    const u = unitById(h.unitId)!;
    return {
      id: h.id,
      holdId: h.id,
      unit: unitRef(h.unitId),
      kind: h.kind,
      origin: h.origin,
      reason: h.reason,
      locationId: u.locationId,
      locationName: locationById(u.locationId)?.name ?? null,
      placedAt: daysAgo(h.placedDaysAgo),
      placedBy: memberById(h.actorId).name,
      placedById: h.actorId,
      ageDays: h.placedDaysAgo,
    };
  });
const testRows = (): QaTestRow[] =>
  TESTS.map((t) => ({
    id: t.id,
    unit: unitRef(t.unitId),
    panel: t.panel,
    analyte: t.analyte,
    value: t.value,
    uom: t.uom,
    limitMin: null,
    limitMax: t.panel === "PESTICIDES" ? 0.1 : null,
    verdict: t.verdict,
    labId: organizationById(t.labId)?.id ?? null,
    labName: organizationById(t.labId)?.name ?? null,
    testedAt: daysAgo(t.daysAgo),
    recordedBy: { id: 2, name: memberById(2).name },
  }));
const incidentRows = (): QaIncidentRow[] =>
  INCIDENTS.map((i) => {
    const u = unitById(i.unitId)!;
    const c = cultivarById(u.cultivarId);
    const e = experimentById(u.experimentId);
    return {
      id: i.id,
      title: i.title,
      description: i.description,
      severity: i.severity,
      status: i.status,
      resolution:
        i.status === "CLOSED" ? "Tray relabelled and verified against the manifest." : null,
      unit: unitRef(i.unitId),
      cultivar: c ? { id: c.id, name: c.name } : null,
      experiment: e ? { id: e.id, ecode: e.ecode } : null,
      createdAt: daysAgo(i.createdDaysAgo),
      openedBy: memberById(i.reporterId).name,
      openedById: i.reporterId,
    };
  });

export async function getQaOverview(
  _user: SessionUser,
  f: {
    view: QaView;
    q?: string;
    sort?: string;
    order: "asc" | "desc";
    page: number;
    limit: number;
    holdKind?: "HOLD" | "QUARANTINE";
    verdict?: MockVerdict;
    severity?: "CRITICAL" | "MAJOR" | "MINOR";
  }
) {
  const single = f.view !== "overview";
  const section = <T>(
    rows: T[],
    sorters: Record<string, (r: T) => string | number | Date | null>,
    target: QaView
  ) => {
    const sorted =
      single && f.view === target && f.sort && sorters[f.sort]
        ? sortBy(rows, sorters[f.sort]!, f.order)
        : rows;
    return {
      rows: single
        ? f.view === target
          ? slicePage(sorted, f.page, f.limit)
          : []
        : sorted.slice(0, 5),
      total: rows.length,
    };
  };

  const holds = holdRows().filter(
    (h) => matches(f.q, h.unit.name, h.reason) && (!f.holdKind || h.kind === f.holdKind)
  );
  const tests = testRows().filter(
    (t) => matches(f.q, t.unit.name, t.analyte) && (!f.verdict || t.verdict === f.verdict)
  );
  const incidents = incidentRows().filter(
    (i) => matches(f.q, i.title, i.description) && (!f.severity || i.severity === f.severity)
  );

  return {
    counts: {
      holds: HOLDS.length,
      quarantines: HOLDS.filter((h) => h.kind === "QUARANTINE").length,
      failedTests: TESTS.filter((t) => t.verdict === "FAIL").length,
      pendingTests: TESTS.filter((t) => t.verdict === "INCONCLUSIVE" || t.verdict === "RECORDED")
        .length,
      openIncidents: INCIDENTS.filter((i) => i.status !== "CLOSED").length,
      criticalIncidents: INCIDENTS.filter((i) => i.status !== "CLOSED" && i.severity === "CRITICAL")
        .length,
    },
    holds: section(
      holds,
      { unit: (h) => h.unit.name.toLowerCase(), kind: (h) => h.kind, age: (h) => h.ageDays },
      "holds"
    ),
    tests: section(
      tests,
      {
        unit: (t) => t.unit.name.toLowerCase(),
        panel: (t) => t.panel,
        verdict: (t) => t.verdict,
        date: (t) => t.testedAt,
      },
      "tests"
    ),
    incidents: section(
      incidents,
      {
        title: (i) => i.title.toLowerCase(),
        severity: (i) => i.severity,
        status: (i) => i.status,
        date: (i) => i.createdAt,
      },
      "incidents"
    ),
  };
}

// --- Destroyed units ----------------------------------------------------------------------------

export const DESTROYED_LIST_SORTS = ["name", "type", "cultivar", "date"] as const;

export type DestroyedListRow = {
  id: number;
  name: string;
  type: MockUnit["type"];
  cultivarId: number | null;
  cultivarName: string | null;
  experiment: { id: number; ecode: string } | null;
  destroyedAt: Date;
  recordedAt: Date;
  reason: string | null;
  comment: string | null;
  actor: string;
  actorId: number;
  witness: string | null;
  witnessId: number | null;
  lastWeightGrams: number | null;
  locationId: number | null;
  locationName: string | null;
};

export async function listDestroyedUnits(
  _user: SessionUser,
  f: {
    q?: string;
    type?: MockUnit["type"];
    from?: string;
    to?: string;
    sort: (typeof DESTROYED_LIST_SORTS)[number];
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  let rows: DestroyedListRow[] = UNITS.filter((u) => u.status === "destroyed").map((u) => {
    const e = experimentById(u.experimentId);
    return {
      id: u.id,
      name: u.name,
      type: u.type,
      cultivarId: u.cultivarId,
      cultivarName: cultivarById(u.cultivarId)?.name ?? null,
      experiment: e ? { id: e.id, ecode: e.ecode } : null,
      destroyedAt: daysAgo(u.updatedDaysAgo),
      recordedAt: new Date(daysAgo(u.updatedDaysAgo).getTime() + 3_600_000),
      reason: u.id === 15 ? "Failed microbial panel." : "Surplus after study close-out.",
      comment: "Disposed per SOP-14.",
      actor: memberById(1).name,
      actorId: 1,
      witness: memberById(3).name,
      witnessId: 3,
      lastWeightGrams: u.id === 15 ? 112 : null,
      locationId: u.locationId,
      locationName: locationById(u.locationId)?.name ?? null,
    };
  });
  rows = rows.filter(
    (u) =>
      matches(f.q, u.name, u.cultivarName, u.reason) &&
      (!f.type || u.type === f.type) &&
      (!f.from || u.destroyedAt >= new Date(`${f.from}T00:00:00`)) &&
      (!f.to || u.destroyedAt <= new Date(`${f.to}T23:59:59`))
  );
  const key = {
    name: (u: DestroyedListRow) => u.name.toLowerCase(),
    type: (u: DestroyedListRow) => u.type,
    cultivar: (u: DestroyedListRow) => u.cultivarName,
    date: (u: DestroyedListRow) => u.destroyedAt,
  }[f.sort];
  rows = sortBy(rows, key, f.order);
  return { rows: slicePage(rows, f.page, f.limit), total: rows.length };
}

// --- Recall ---------------------------------------------------------------------------------------

export type RecallNode = {
  id: number;
  name: string;
  type: MockUnit["type"];
  standing: "active" | "on-hold" | "quarantine" | "shipped" | "destroyed";
  cultivar: string | null;
  cultivarId: number | null;
  experiment: { id: number; ecode: string } | null;
  locationId: number | null;
  locationName: string | null;
  hold: {
    kind: "HOLD" | "QUARANTINE";
    origin: "MANUAL" | "AUTO_TEST" | "AUTO_INCIDENT";
    reason: string;
    placedAt: Date;
  } | null;
  shippedTo: { id: number; name: string } | null;
  shipmentIds: number[];
  relation: "self" | "upstream" | "downstream" | "same-cultivar";
  generation: number | null;
};

const nodeFor = (
  u: MockUnit,
  relation: RecallNode["relation"],
  generation: number | null
): RecallNode => {
  const h = HOLDS.find((x) => x.unitId === u.id);
  const ship = SHIPMENTS.find((s) => s.direction === "OUTBOUND" && s.units.includes(u.id));
  const e = experimentById(u.experimentId);
  return {
    id: u.id,
    name: u.name,
    type: u.type,
    standing: u.status,
    cultivar: cultivarById(u.cultivarId)?.name ?? null,
    cultivarId: u.cultivarId,
    experiment: e ? { id: e.id, ecode: e.ecode } : null,
    locationId: u.locationId,
    locationName: locationById(u.locationId)?.name ?? null,
    hold: h
      ? { kind: h.kind, origin: h.origin, reason: h.reason, placedAt: daysAgo(h.placedDaysAgo) }
      : null,
    shippedTo: ship
      ? { id: ship.organizationId, name: organizationById(ship.organizationId)!.name }
      : null,
    shipmentIds: SHIPMENTS.filter((s) => s.units.includes(u.id)).map((s) => s.id),
    relation,
    generation,
  };
};

export type RecallTrace = NonNullable<Awaited<ReturnType<typeof getRecallTrace>>>;

export async function getRecallTrace(_user: SessionUser, unitId: number) {
  const origin = unitById(unitId);
  if (!origin) return null;

  const upstream: RecallNode[] = [];
  for (let cur = origin, gen = -1; cur.parentId; gen -= 1) {
    const p = unitById(cur.parentId);
    if (!p) break;
    upstream.unshift(nodeFor(p, "upstream", gen));
    cur = p;
  }
  const downstream: RecallNode[] = [];
  const walk = (parentId: number, gen: number) => {
    for (const child of UNITS.filter((u) => u.parentId === parentId)) {
      downstream.push(nodeFor(child, "downstream", gen));
      walk(child.id, gen + 1);
    }
  };
  walk(origin.id, 1);

  const all = [...upstream, nodeFor(origin, "self", 0), ...downstream];
  const shipmentIds = [...new Set(all.flatMap((n) => n.shipmentIds))];
  const shipments = SHIPMENTS.filter((s) => shipmentIds.includes(s.id)).map((s) => ({
    id: s.id,
    reference: s.reference,
    direction: s.direction,
    status: s.status,
    organization: { id: s.organizationId, name: organizationById(s.organizationId)!.name },
    unitNames: s.units
      .map((uid) => unitById(uid)!.name)
      .filter((n) => all.some((a) => a.name === n)),
    units: s.units
      .map((uid) => unitById(uid)!)
      .filter((u) => all.some((a) => a.id === u.id))
      .map((u) => ({ id: u.id, name: u.name })),
  }));
  const organizations = [...new Set(shipments.map((s) => s.organization.id))].map((oid) => {
    const o = organizationById(oid)!;
    const mine = shipments.filter((s) => s.organization.id === oid);
    return {
      id: oid,
      name: o.name,
      licenceNumber: o.licence as string | null,
      unitCount: mine.reduce((sum, s) => sum + s.unitNames.length, 0),
      shipmentIds: mine.map((s) => s.id),
    };
  });
  const peers = UNITS.filter(
    (u) =>
      u.cultivarId === origin.cultivarId && u.id !== origin.id && !all.some((n) => n.id === u.id)
  );

  return {
    origin: nodeFor(origin, "self", 0),
    upstream,
    downstream,
    shipments,
    organizations,
    sameCultivar: peers.slice(0, 5).map((u) => nodeFor(u, "same-cultivar", null)),
    sameCultivarTotal: peers.length,
    truncated: false,
    counts: {
      upstream: upstream.length,
      downstream: downstream.length,
      inInventory: all.filter((n) => n.standing === "active").length,
      onHold: all.filter((n) => n.hold && n.standing !== "shipped" && n.standing !== "destroyed")
        .length,
      shipped: all.filter((n) => n.standing === "shipped").length,
      organizations: organizations.length,
      shipments: shipments.length,
    },
  };
}

export async function searchRecallUnits(_user: SessionUser, q: string) {
  return UNITS.filter((u) => matches(q, u.name, cultivarById(u.cultivarId)?.name))
    .slice(0, 20)
    .map((u) => ({
      id: u.id,
      name: u.name,
      type: u.type,
      cultivar: cultivarById(u.cultivarId)?.name ?? null,
      cultivarId: u.cultivarId,
      standing: u.status,
      active: isActiveUnit(u),
    }));
}
