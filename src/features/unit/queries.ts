import type {
  GrowthStage,
  HoldKind,
  HoldOrigin,
  IncidentSeverity,
  IncidentStatus,
  TestVerdict,
  UnitStateKind,
  UnitType,
} from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/auth";
import type { LedgerEvent } from "@/lib/ledger-types";
import {
  deriveMaterialClass,
  terminalKindOf,
  type MaterialClass,
  type TerminalKind,
  type UnitStatusKey,
} from "@/lib/unit-profile";
import { buildLocationHistory, type LocatedState, type LocationHistory } from "@/lib/traceability";
import { summarizeStageDurations, type StageDurationSummary } from "@/lib/stage-durations";
import {
  cultivarById,
  daysAgo,
  experimentById,
  EXPERIMENTS,
  HOLDS,
  INCIDENTS,
  isActiveUnit,
  locationById,
  LOCATIONS,
  matches,
  memberById,
  MEMBERS,
  organizationById,
  slicePage,
  sortBy,
  TESTS,
  unitById,
  UNITS,
  type MockUnit,
} from "@/features/mock/data";
import type {
  ActivityType,
  AttachmentCategory,
  SourceType,
  TestPanel,
} from "@/generated/prisma/enums";

export const UNIT_LIST_SORTS = ["name", "type", "cultivar", "location", "date"] as const;
export const UNIT_LIST_STATUSES = ["active", "hold", "shipped", "destroyed"] as const;
export const UNIT_LIST_STAGES = [
  "VEGETATIVE",
  "FLOWERING",
  "HARVESTED",
  "DRYING",
  "CURING",
  "STORAGE",
  "SEED",
  "CULTURE",
] as const;

export type UnitListRow = {
  id: number;
  name: string;
  type: UnitType;
  cultivarId: number | null;
  cultivarName: string | null;
  experiment: { id: number; ecode: string } | null;
  locationId: number | null;
  locationName: string | null;
  lastUpdated: Date;
  status: UnitStatusKey;
};

const toListRow = (u: MockUnit): UnitListRow => {
  const e = experimentById(u.experimentId);
  return {
    id: u.id,
    name: u.name,
    type: u.type,
    cultivarId: u.cultivarId,
    cultivarName: cultivarById(u.cultivarId)?.name ?? null,
    experiment: e ? { id: e.id, ecode: e.ecode } : null,
    locationId: u.locationId,
    locationName: locationById(u.locationId)?.name ?? null,
    lastUpdated: daysAgo(u.updatedDaysAgo),
    status: u.status,
  };
};

export async function listUnits(
  _user: SessionUser,
  f: {
    q?: string;
    type?: UnitType;
    status?: (typeof UNIT_LIST_STATUSES)[number];
    locationId?: number;
    stage?: (typeof UNIT_LIST_STAGES)[number];
    sort: (typeof UNIT_LIST_SORTS)[number];
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  let rows = UNITS.filter((u) => {
    if (f.type && u.type !== f.type) return false;
    if (f.locationId && u.locationId !== f.locationId) return false;
    if (f.stage && u.stage !== f.stage) return false;
    if (f.status === "active" && !isActiveUnit(u)) return false;
    if (f.status === "hold" && u.status !== "on-hold" && u.status !== "quarantine") return false;
    if ((f.status === "shipped" || f.status === "destroyed") && u.status !== f.status) return false;
    return matches(
      f.q,
      u.name,
      cultivarById(u.cultivarId)?.name,
      experimentById(u.experimentId)?.ecode
    );
  }).map(toListRow);
  const key = {
    name: (u: UnitListRow) => u.name.toLowerCase(),
    type: (u: UnitListRow) => u.type,
    cultivar: (u: UnitListRow) => u.cultivarName,
    location: (u: UnitListRow) => u.locationName,
    date: (u: UnitListRow) => u.lastUpdated,
  }[f.sort];
  rows = sortBy(rows, key, f.order);
  return { rows: slicePage(rows, f.page, f.limit), total: rows.length };
}

export async function listLocationOptions(_selectedId?: number) {
  return LOCATIONS.filter((l) => l.active).map((l) => ({ id: l.id, name: l.name }));
}

export async function listWitnessOptions(_user: SessionUser) {
  return MEMBERS.filter((m) => m.status === "active").map((m) => ({ id: m.id, name: m.name }));
}

// --- Per-unit event history ------------------------------------------------------------------

export type UnitStateRow = {
  id: number;
  sequence: number;
  kind: UnitStateKind;
  effectiveAt: Date;
  recordedAt: Date;
  recordedBy: string;
  recordedById: number;
  scanConfirmed: boolean;
  locationId: number | null;
  locationName: string | null;
  growthStage: GrowthStage | null;
  humidWeight: number | null;
  dryWeight: number | null;
  seedCount: number | null;
  organizationId: number | null;
  organizationName: string | null;
  reason: string | null;
  witnessId: number | null;
  witnessName: string | null;
  comment: string | null;
};

function statesFor(u: MockUnit): UnitStateRow[] {
  const rows: UnitStateRow[] = [];
  const base = u.updatedDaysAgo + 40;
  const loc = (id: number | null) => locationById(id);
  const push = (partial: Partial<UnitStateRow> & Pick<UnitStateRow, "kind" | "effectiveAt">) => {
    const sequence = rows.length + 1;
    const l = partial.locationId !== undefined ? loc(partial.locationId) : null;
    rows.push({
      id: u.id * 100 + sequence,
      sequence,
      recordedAt: new Date(partial.effectiveAt.getTime() + 3_600_000),
      recordedBy: memberById(2).name,
      recordedById: 2,
      scanConfirmed: false,
      locationId: null,
      locationName: l?.name ?? null,
      growthStage: null,
      humidWeight: null,
      dryWeight: null,
      seedCount: null,
      organizationId: null,
      organizationName: null,
      reason: null,
      witnessId: null,
      witnessName: null,
      comment: null,
      ...partial,
    });
  };

  const home = u.locationId ?? 3;
  const received = u.type === "SEEDLOT";
  push({
    kind: received ? "RECEIVED" : "CREATED",
    effectiveAt: daysAgo(base),
    locationId: received ? 1 : 3,
    growthStage: u.type === "SEEDLOT" ? "SEED" : u.type === "CULTURE" ? "CULTURE" : "VEGETATIVE",
    seedCount: u.type === "SEEDLOT" ? 250 : null,
    organizationId: received ? 1 : null,
    organizationName: received ? organizationById(1)!.name : null,
  });
  if (u.type === "PLANT" || u.type === "FLOWER") {
    push({
      kind: "STAGE_CHANGED",
      effectiveAt: daysAgo(base - 18),
      locationId: 3,
      growthStage: "VEGETATIVE",
    });
    if (u.stage && u.stage !== "VEGETATIVE") {
      push({
        kind: "MOVED",
        effectiveAt: daysAgo(base - 20),
        locationId: 2,
        scanConfirmed: true,
        comment: "Moved for flip.",
      });
      push({
        kind: "STAGE_CHANGED",
        effectiveAt: daysAgo(base - 22),
        locationId: 2,
        growthStage: "FLOWERING",
      });
    }
    if (["DRYING", "CURING", "STORAGE", "HARVESTED"].includes(u.stage ?? "")) {
      push({
        kind: "STAGE_CHANGED",
        effectiveAt: daysAgo(base - 30),
        locationId: 2,
        growthStage: "HARVESTED",
        humidWeight: u.humidWeight,
      });
      push({
        kind: "MOVED",
        effectiveAt: daysAgo(base - 31),
        locationId: 4,
        growthStage: "DRYING",
      });
      if (u.stage !== "DRYING" && u.stage !== "HARVESTED") {
        push({
          kind: "STAGE_CHANGED",
          effectiveAt: daysAgo(base - 36),
          locationId: 4,
          growthStage: u.stage as GrowthStage,
          humidWeight: u.humidWeight,
          dryWeight: u.dryWeight,
        });
        if (home !== 4)
          push({
            kind: "MOVED",
            effectiveAt: daysAgo(base - 37),
            locationId: home,
            growthStage: u.stage as GrowthStage,
          });
      }
    }
  } else if (u.type === "CULTURE") {
    push({
      kind: "MEASURED",
      effectiveAt: daysAgo(base - 10),
      locationId: 5,
      growthStage: "CULTURE",
      comment: "Subculture check, no contamination.",
    });
  }
  if (u.status === "shipped") {
    push({
      kind: "SHIPPED",
      effectiveAt: daysAgo(u.updatedDaysAgo),
      organizationId: 3,
      organizationName: organizationById(3)!.name,
      reason: "Customer order",
    });
  }
  if (u.status === "destroyed") {
    push({
      kind: "DESTROYED",
      effectiveAt: daysAgo(u.updatedDaysAgo),
      reason: "Failed microbial panel.",
      witnessId: 3,
      witnessName: memberById(3).name,
      comment: "Disposed per SOP-14.",
    });
  }
  return rows;
}

export async function getUnitStates(_user: SessionUser, unitId: number): Promise<UnitStateRow[]> {
  const u = unitById(unitId);
  return u ? statesFor(u) : [];
}

// --- Profile ------------------------------------------------------------------------------------

export type UnitProfile = {
  id: number;
  name: string;
  type: UnitType;
  status: UnitStatusKey;
  terminal: TerminalKind | null;
  material: MaterialClass;
  sex: string | null;
  notes: string | null;
  createdAt: Date;
  access: { canEdit: boolean; isAdmin: boolean };
  cultivar: { id: number; name: string } | null;
  experiment: {
    id: number;
    ecode: string;
    name: string;
    leadId: number | null;
    leadName: string | null;
  } | null;
  current: {
    kind: UnitStateKind;
    sequence: number;
    locationId: number | null;
    locationName: string | null;
    growthStage: GrowthStage | null;
    seedCount: number | null;
    recordedBy: string;
    recordedById: number;
    recordedAt: Date;
  } | null;
  weights: { humid: number | null; dry: number | null; isHarvested: boolean };
  source: {
    type: SourceType | null;
    provider: { id: number; name: string; country: string | null } | null;
    receivedAt: Date | null;
    receptionNote: string | null;
    description: string | null;
  };
  parent: { id: number; name: string; note: string | null } | null;
  lineage: {
    mother: { id: number; name: string } | null;
    generation: number;
    ancestry: Array<{ id: number; name: string }>;
  };
  children: Array<{ id: number; name: string; type: UnitType; note: string | null }>;
  childCount: number;
  experimentChain: Array<{ id: number; ecode: string; name: string }>;
  subExperiments: Array<{ id: number; ecode: string; name: string; fromThisUnit: boolean }>;
  hold: {
    id: number;
    kind: HoldKind;
    origin: HoldOrigin;
    reason: string;
    placedBy: string;
    placedById: number;
    placedAt: Date;
  } | null;
  destruction: {
    at: Date;
    recordedBy: string | null;
    recordedById: number | null;
    reason: string | null;
    witness: string | null;
    witnessId: number | null;
  } | null;
  shipment: { at: Date; organization: string | null; organizationId: number | null } | null;
  locationHistory: LocationHistory;
  stageDurations: StageDurationSummary;
};

export async function getUnitProfile(user: SessionUser, id: number): Promise<UnitProfile | null> {
  const u = unitById(id);
  if (!u) return null;
  const states = statesFor(u);
  const current = states[states.length - 1] ?? null;
  const exp = experimentById(u.experimentId);
  const parent = u.parentId ? unitById(u.parentId) : null;
  const holdRow = HOLDS.find((h) => h.unitId === id) ?? null;
  const terminal = terminalKindOf(current?.kind);
  const shippedState = states.find((s) => s.kind === "SHIPPED");
  const destroyedState = states.find((s) => s.kind === "DESTROYED");
  const kids = UNITS.filter((c) => c.parentId === id);
  const chain: Array<{ id: number; ecode: string; name: string }> = [];
  for (let e = exp; e; e = experimentById(e.parentId))
    chain.unshift({ id: e.id, ecode: e.ecode, name: e.name });
  const located: LocatedState[] = states.map((s) => ({
    sequence: s.sequence,
    kind: s.kind,
    effectiveAt: s.effectiveAt,
    scanConfirmed: s.scanConfirmed,
    comment: s.comment,
    locationId: s.locationId,
    location: s.locationId ? { id: s.locationId, name: s.locationName ?? "" } : null,
    recordedBy: { name: s.recordedBy },
  }));
  const harvested = u.type === "FLOWER" || u.humidWeight !== null || u.dryWeight !== null;
  const mother = u.parentId ? unitById(u.parentId) : null;

  return {
    id: u.id,
    name: u.name,
    type: u.type,
    status: u.status,
    terminal,
    material: deriveMaterialClass(u.type, {
      hasParent: parent !== null,
      hasProvider: u.type === "SEEDLOT",
    }),
    sex: u.sex ?? null,
    notes:
      u.id === 1
        ? "Mother plant for the spring trial. Keep tags attached; photograph weekly."
        : null,
    createdAt: states[0]?.effectiveAt ?? daysAgo(60),
    access: {
      canEdit: user.permissions === "ADMIN" && terminal === null,
      isAdmin: user.permissions === "ADMIN",
    },
    cultivar: u.cultivarId ? { id: u.cultivarId, name: cultivarById(u.cultivarId)!.name } : null,
    experiment: exp
      ? {
          id: exp.id,
          ecode: exp.ecode,
          name: exp.name,
          leadId: exp.leadId,
          leadName: memberById(exp.leadId).name,
        }
      : null,
    current: current
      ? {
          kind: current.kind,
          sequence: current.sequence,
          locationId: current.locationId ?? u.locationId,
          locationName: current.locationName ?? locationById(u.locationId)?.name ?? null,
          growthStage: (u.stage as GrowthStage | null) ?? current.growthStage,
          seedCount: current.seedCount,
          recordedBy: current.recordedBy,
          recordedById: current.recordedById,
          recordedAt: current.recordedAt,
        }
      : null,
    weights: { humid: u.humidWeight, dry: u.dryWeight, isHarvested: harvested },
    source: {
      type: u.type === "SEEDLOT" ? "RECEIVED" : parent ? "CUTTING" : "SEED",
      provider:
        u.type === "SEEDLOT" ? { id: 1, name: organizationById(1)!.name, country: "CA" } : null,
      receivedAt: u.type === "SEEDLOT" ? daysAgo(u.updatedDaysAgo) : null,
      receptionNote: u.type === "SEEDLOT" ? "Sealed on arrival; manifest MAN-88341 matched." : null,
      description: parent ? `Cutting taken from ${parent.name}.` : null,
    },
    parent: parent ? { id: parent.id, name: parent.name, note: null } : null,
    lineage: (() => {
      const ancestry: Array<{ id: number; name: string }> = [];
      for (let cur = parent; cur; cur = cur.parentId ? unitById(cur.parentId) : null)
        ancestry.unshift({ id: cur.id, name: cur.name });
      return {
        mother: mother ? { id: mother.id, name: mother.name } : null,
        generation: ancestry.length,
        ancestry: ancestry.slice(0, -1),
      };
    })(),
    children: kids.map((k) => ({ id: k.id, name: k.name, type: k.type, note: "Cutting" })),
    childCount: kids.length,
    experimentChain: chain,
    subExperiments: EXPERIMENTS.filter(
      (e) => e.parentId === u.experimentId && u.experimentId !== null
    ).map((e) => ({
      id: e.id,
      ecode: e.ecode,
      name: e.name,
      fromThisUnit: u.id === 1,
    })),
    hold: holdRow
      ? {
          id: holdRow.id,
          kind: holdRow.kind,
          origin: holdRow.origin,
          reason: holdRow.reason,
          placedBy: memberById(holdRow.actorId).name,
          placedById: holdRow.actorId,
          placedAt: daysAgo(holdRow.placedDaysAgo),
        }
      : null,
    destruction: destroyedState
      ? {
          at: destroyedState.effectiveAt,
          recordedBy: destroyedState.recordedBy,
          recordedById: destroyedState.recordedById,
          reason: destroyedState.reason,
          witness: destroyedState.witnessName,
          witnessId: destroyedState.witnessId,
        }
      : null,
    shipment: shippedState
      ? {
          at: shippedState.effectiveAt,
          organization: shippedState.organizationName,
          organizationId: shippedState.organizationId,
        }
      : null,
    locationHistory: buildLocationHistory(located),
    stageDurations: summarizeStageDurations(states, {
      endedAt: terminal ? (shippedState ?? destroyedState)?.effectiveAt : null,
    }),
  };
}

// --- Quality ------------------------------------------------------------------------------------

export type UnitTestView = {
  id: number;
  panel: TestPanel;
  analyte: string;
  value: number | null;
  uom: string | null;
  limitMin: number | null;
  limitMax: number | null;
  verdict: TestVerdict;
  labId: number | null;
  labName: string | null;
  comment: string | null;
  testedAt: Date;
  recordedBy: string;
  recordedById: number;
};
export type UnitIncidentView = {
  id: number;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  resolution: string | null;
  openedBy: string;
  openedById: number;
  openedAt: Date;
  closedAt: Date | null;
};
export type UnitHoldView = {
  id: number;
  kind: HoldKind;
  origin: HoldOrigin;
  reason: string;
  placedBy: string;
  placedById: number;
  placedAt: Date;
  releasedBy: string | null;
  releasedAt: Date | null;
  releaseNote: string | null;
};
export type UnitQuality = {
  tests: UnitTestView[];
  incidents: UnitIncidentView[];
  holds: UnitHoldView[];
};

export async function getUnitQuality(_user: SessionUser, unitId: number): Promise<UnitQuality> {
  return {
    tests: TESTS.filter((t) => t.unitId === unitId).map((t) => ({
      id: t.id,
      panel: t.panel,
      analyte: t.analyte,
      value: t.value,
      uom: t.uom,
      limitMin: null,
      limitMax: t.panel === "PESTICIDES" ? 0.1 : null,
      verdict: t.verdict,
      labId: organizationById(t.labId) ? t.labId : null,
      labName: organizationById(t.labId)?.name ?? null,
      comment: t.verdict === "FAIL" ? "Exceeds action limit; retest recommended." : null,
      testedAt: daysAgo(t.daysAgo),
      recordedBy: memberById(2).name,
      recordedById: 2,
    })),
    incidents: INCIDENTS.filter((i) => i.unitId === unitId).map((i) => ({
      id: i.id,
      title: i.title,
      description: i.description,
      severity: i.severity,
      status: i.status,
      resolution:
        i.status === "CLOSED" ? "Tray relabelled and verified against the manifest." : null,
      openedBy: memberById(i.reporterId).name,
      openedById: i.reporterId,
      openedAt: daysAgo(i.createdDaysAgo),
      closedAt: i.status === "CLOSED" ? daysAgo(i.createdDaysAgo - 2) : null,
    })),
    holds: HOLDS.filter((h) => h.unitId === unitId).map((h) => ({
      id: h.id,
      kind: h.kind,
      origin: h.origin,
      reason: h.reason,
      placedBy: memberById(h.actorId).name,
      placedById: h.actorId,
      placedAt: daysAgo(h.placedDaysAgo),
      releasedBy: null,
      releasedAt: null,
      releaseNote: null,
    })),
  };
}

// --- Documents ----------------------------------------------------------------------------------

export type UnitAttachmentView = {
  id: number;
  label: string;
  fileName: string;
  category: AttachmentCategory;
  sizeBytes: number;
  sha256: string;
  uploadedBy: string;
  uploadedById: number;
  uploadedAt: Date;
};
export type UnitActivityView = {
  id: number;
  type: ActivityType;
  title: string;
  details: string | null;
  recordedBy: string;
  recordedById: number;
  date: Date;
};
export type UnitDocuments = { attachments: UnitAttachmentView[]; activities: UnitActivityView[] };

export async function getUnitDocuments(_user: SessionUser, unitId: number): Promise<UnitDocuments> {
  const u = unitById(unitId);
  if (!u || u.type === "SEEDLOT") return { attachments: [], activities: [] };
  return {
    attachments: [
      {
        id: unitId * 10 + 1,
        label: "Canopy photo, week 6",
        fileName: `${u.name}-week6.jpg`,
        category: "PHOTO",
        sizeBytes: 2_483_112,
        sha256: "9f2b6c1d7a4e8b30c5d1e9a7f4b2c8d6e0a3b5c7d9f1e2a4b6c8d0e2f4a6b8c0",
        uploadedBy: memberById(2).name,
        uploadedById: 2,
        uploadedAt: daysAgo(6),
      },
    ],
    activities: [
      {
        id: unitId * 10 + 2,
        type: "NUTRIENT",
        title: "Bloom feed",
        details: "EC 1.8, pH 6.1, 2 L per plant.",
        recordedBy: memberById(3).name,
        recordedById: 3,
        date: daysAgo(4),
      },
      {
        id: unitId * 10 + 3,
        type: "SCOUTING",
        title: "Weekly scouting",
        details: "No pests observed.",
        recordedBy: memberById(2).name,
        recordedById: 2,
        date: daysAgo(2),
      },
    ],
  };
}

// --- Ledger -------------------------------------------------------------------------------------

export async function getUnitLedger(user: SessionUser, unitId: number): Promise<LedgerEvent[]> {
  const u = unitById(unitId);
  if (!u) return [];
  const states = statesFor(u);
  const events: LedgerEvent[] = states.map((s, index): LedgerEvent => {
    const before = states[index - 1];
    const base = {
      key: `state-${s.id}`,
      at: s.effectiveAt.toISOString(),
      recordedAt: s.recordedAt.toISOString(),
      actor: s.recordedBy,
      actorId: s.recordedById,
      sequence: s.sequence,
      note: s.comment ?? s.reason,
    };
    switch (s.kind) {
      case "CREATED":
        return {
          ...base,
          type: "REGISTERED",
          facts: {
            unitType: u.type,
            cultivar: cultivarById(u.cultivarId)?.name ?? null,
            experiment: experimentById(u.experimentId)?.ecode ?? null,
            sourceType: u.parentId ? "CUTTING" : "SEED",
          },
        };
      case "RECEIVED":
        return {
          ...base,
          type: "RECEIVED",
          facts: { organization: s.organizationName, organizationId: s.organizationId },
        };
      case "MOVED":
        return {
          ...base,
          type: "MOVED",
          facts: {
            from: before?.locationName ?? null,
            fromId: before?.locationId ?? null,
            to: s.locationName,
            toId: s.locationId,
            scanConfirmed: s.scanConfirmed,
          },
        };
      case "STAGE_CHANGED":
        return {
          ...base,
          type: "STAGE_CHANGED",
          facts: { from: before?.growthStage ?? null, to: s.growthStage },
        };
      case "MEASURED":
        return {
          ...base,
          type: "MEASURED",
          facts: { humid: s.humidWeight, dry: s.dryWeight, seeds: s.seedCount },
        };
      case "SHIPPED":
        return {
          ...base,
          type: "SHIPPED",
          facts: { organization: s.organizationName, organizationId: s.organizationId },
        };
      default:
        return {
          ...base,
          type: "DESTROYED",
          facts: { witness: s.witnessName, witnessId: s.witnessId },
        };
    }
  });
  for (const t of TESTS.filter((x) => x.unitId === unitId)) {
    events.push({
      key: `test-${t.id}`,
      type: "TEST",
      at: daysAgo(t.daysAgo).toISOString(),
      recordedAt: null,
      actor: memberById(2).name,
      actorId: 2,
      sequence: null,
      facts: {
        panel: t.panel,
        analyte: t.analyte,
        verdict: t.verdict,
        value: t.value,
        uom: t.uom,
        lab: organizationById(t.labId)?.name ?? null,
        labId: organizationById(t.labId) ? t.labId : null,
      },
      note: null,
    });
  }
  for (const h of HOLDS.filter((x) => x.unitId === unitId)) {
    events.push({
      key: `hold-${h.id}`,
      type: "HOLD_PLACED",
      at: daysAgo(h.placedDaysAgo).toISOString(),
      recordedAt: null,
      actor: memberById(h.actorId).name,
      actorId: h.actorId,
      sequence: null,
      facts: { holdKind: h.kind, holdOrigin: h.origin },
      note: h.reason,
    });
  }
  for (const i of INCIDENTS.filter((x) => x.unitId === unitId)) {
    events.push({
      key: `incident-${i.id}`,
      type: "INCIDENT",
      at: daysAgo(i.createdDaysAgo).toISOString(),
      recordedAt: null,
      actor: memberById(i.reporterId).name,
      actorId: i.reporterId,
      sequence: null,
      facts: { severity: i.severity, title: i.title, incidentStatus: i.status },
      note: i.description,
    });
  }
  return events.sort((a, b) => b.at.localeCompare(a.at));
}
