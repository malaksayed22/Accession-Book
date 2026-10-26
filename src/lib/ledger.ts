import type {
  ActivityType,
  AttachmentCategory,
  GrowthStage,
  HoldKind,
  HoldOrigin,
  IncidentSeverity,
  IncidentStatus,
  ShipmentDirection,
  ShipmentStatus,
  SourceType,
  TestPanel,
  TestVerdict,
  UnitStateKind,
  UnitType,
} from "@/generated/prisma/enums";
import type { LedgerEvent, LedgerFacts } from "./ledger-types";

export type { LedgerEvent, LedgerEventType, LedgerFacts } from "./ledger-types";

/**
 * Builds the unit's ledger from plain rows. Pure: the database reads live in
 * `features/unit/queries.ts`, which hands the rows over, so the assembly is unit-testable and the
 * output holds enums and numbers, never sentences.
 *
 * Voided records are left out of the input (their void shows up through the audit trail).
 */
type Named = { id: number; name: string };

export type LedgerSource = {
  unit: {
    name: string;
    type: UnitType;
    cultivarName: string | null;
    experimentCode: string | null;
    sourceType: SourceType | null;
    sourceParent: Named | null;
  };
  /** Every state of the unit, any order. */
  states: Array<{
    id: number;
    sequence: number;
    kind: UnitStateKind;
    effectiveAt: Date;
    recordedAt: Date;
    recordedBy: string | null;
    locationName: string | null;
    growthStage: GrowthStage | null;
    humidWeight: number | null;
    dryWeight: number | null;
    seedCount: number | null;
    organizationName: string | null;
    scanConfirmed: boolean;
    reason: string | null;
    witnessName: string | null;
    comment: string | null;
    parentStateId: number | null;
    parentUnit: Named | null;
  }>;
  derived: Array<{ id: number; name: string; at: Date; actor: string | null }>;
  holds: Array<{
    id: number;
    kind: HoldKind;
    origin: HoldOrigin;
    reason: string;
    placedAt: Date;
    placedBy: string;
    releasedAt: Date | null;
    releasedBy: string | null;
    releaseNote: string | null;
  }>;
  activities: Array<{
    id: number;
    type: ActivityType;
    title: string;
    details: string | null;
    date: Date;
    actor: string;
  }>;
  attachments: Array<{
    id: number;
    label: string;
    fileName: string;
    category: AttachmentCategory;
    createdAt: Date;
    actor: string;
  }>;
  shipments: Array<{
    shipmentId: number;
    reference: string;
    direction: ShipmentDirection;
    status: ShipmentStatus;
    description: string;
    stateId: number | null;
    at: Date;
    actor: string;
  }>;
  tests: Array<{
    id: number;
    panel: TestPanel;
    analyte: string;
    verdict: TestVerdict;
    value: number | null;
    uom: string | null;
    labName: string | null;
    comment: string | null;
    testedAt: Date;
    createdAt: Date;
    actor: string;
  }>;
  incidents: Array<{
    id: number;
    title: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    createdAt: Date;
    actor: string;
  }>;
  audits: Array<{
    id: number;
    action: string;
    summary: string;
    reason: string | null;
    createdAt: Date;
    actor: string;
  }>;
};

/** Audit actions whose story is already told by an event built from the unit's own records. */
export const COVERED_AUDIT_ACTIONS: ReadonlySet<string> = new Set([
  "create",
  "derive",
  "derive_parent",
  "transfer",
  "stage_transition",
  "measure",
  "destroy",
  "activity",
  "attachment",
  "hold",
  "release",
  "lab_test",
]);

/** Filed this long after it happened counts as back-dated: the gap is worth showing. */
const BACKDATED_AFTER_MS = 60_000;

const iso = (date: Date) => date.toISOString();

function recordedAtIfLater(effectiveAt: Date, recordedAt: Date): string | null {
  return recordedAt.getTime() - effectiveAt.getTime() > BACKDATED_AFTER_MS ? iso(recordedAt) : null;
}

function stateEvent(
  source: LedgerSource,
  state: LedgerSource["states"][number],
  previous: LedgerSource["states"][number] | undefined,
  linkedShipmentStateIds: ReadonlySet<number>
): LedgerEvent[] {
  const base = {
    at: iso(state.effectiveAt),
    recordedAt: recordedAtIfLater(state.effectiveAt, state.recordedAt),
    actor: state.recordedBy,
    sequence: state.sequence,
  };
  const make = (
    type: LedgerEvent["type"],
    facts: LedgerFacts,
    note: string | null,
    href?: string,
    suffix = ""
  ): LedgerEvent => ({
    key: `state-${state.id}${suffix}`,
    type,
    ...base,
    facts,
    note,
    ...(href ? { href } : {}),
  });

  const parent = state.parentUnit;
  const events: LedgerEvent[] = [];
  if (state.sequence === 1) {
    events.push(
      make(
        "REGISTERED",
        {
          unitType: source.unit.type,
          cultivar: source.unit.cultivarName,
          experiment: source.unit.experimentCode,
          sourceType: source.unit.sourceType,
        },
        null,
        undefined,
        "-registered"
      )
    );
  }

  switch (state.kind) {
    case "CREATED":
      if (parent) {
        events.push(
          make(
            "DERIVED_FROM",
            { parent: parent.name },
            state.comment,
            `/inventory/units/${parent.id}`,
            "-derived"
          )
        );
      }
      break;
    case "RECEIVED":
      events.push(make("RECEIVED", { organization: state.organizationName }, state.comment));
      if (parent) {
        events.push(
          make(
            "DERIVED_FROM",
            { parent: parent.name },
            null,
            `/inventory/units/${parent.id}`,
            "-derived"
          )
        );
      }
      break;
    case "MOVED":
      events.push(
        make(
          "MOVED",
          {
            from: previous?.locationName ?? null,
            to: state.locationName,
            scanConfirmed: state.scanConfirmed,
          },
          state.comment
        )
      );
      break;
    case "STAGE_CHANGED":
      events.push(
        make(
          "STAGE_CHANGED",
          { from: previous?.growthStage ?? null, to: state.growthStage },
          state.comment
        )
      );
      break;
    case "MEASURED":
      events.push(
        make(
          "MEASURED",
          { humid: state.humidWeight, dry: state.dryWeight, seeds: state.seedCount },
          state.comment
        )
      );
      break;
    case "SHIPPED":
      // A shipment line that references this state already tells the story, with a link.
      if (!linkedShipmentStateIds.has(state.id)) {
        events.push(make("SHIPPED", { organization: state.organizationName }, state.comment));
      }
      break;
    case "DESTROYED":
      events.push(make("DESTROYED", { witness: state.witnessName }, state.reason));
      break;
  }
  return events;
}

export function buildUnitLedger(source: LedgerSource): LedgerEvent[] {
  const events: LedgerEvent[] = [];
  const states = [...source.states].sort((a, b) => a.sequence - b.sequence);
  const first = states[0];
  const linkedShipmentStateIds = new Set(
    source.shipments.map((s) => s.stateId).filter((id): id is number => id !== null)
  );

  states.forEach((state, index) => {
    events.push(...stateEvent(source, state, states[index - 1], linkedShipmentStateIds));
  });

  // The parent can also be linked after registration; that is an audited change, not a state.
  const linkAudits = source.audits.filter((a) => a.action === "lineage");
  if (source.unit.sourceParent && !first?.parentStateId) {
    const parent = source.unit.sourceParent;
    for (const audit of linkAudits) {
      events.push({
        key: `audit-${audit.id}`,
        type: "LINEAGE_LINKED",
        at: iso(audit.createdAt),
        recordedAt: null,
        actor: audit.actor,
        sequence: null,
        facts: { parent: parent.name },
        note: null,
        href: `/inventory/units/${parent.id}`,
      });
    }
    if (linkAudits.length === 0 && first) {
      // Linked before audit entries existed (imported data): the registration date is all we know.
      events.push({
        key: "lineage-imported",
        type: "LINEAGE_LINKED",
        at: iso(first.effectiveAt),
        recordedAt: null,
        actor: null,
        sequence: null,
        facts: { parent: parent.name },
        note: null,
        href: `/inventory/units/${parent.id}`,
      });
    }
  }

  for (const child of source.derived) {
    events.push({
      key: `child-${child.id}`,
      type: "PRODUCED",
      at: iso(child.at),
      recordedAt: null,
      actor: child.actor,
      sequence: null,
      facts: { child: child.name },
      note: null,
      href: `/inventory/units/${child.id}`,
    });
  }

  for (const hold of source.holds) {
    events.push({
      key: `hold-${hold.id}`,
      type: "HOLD_PLACED",
      at: iso(hold.placedAt),
      recordedAt: null,
      actor: hold.placedBy,
      sequence: null,
      facts: { holdKind: hold.kind, holdOrigin: hold.origin },
      note: hold.reason,
    });
    if (hold.releasedAt) {
      events.push({
        key: `hold-${hold.id}-released`,
        type: "HOLD_RELEASED",
        at: iso(hold.releasedAt),
        recordedAt: null,
        actor: hold.releasedBy,
        sequence: null,
        facts: { holdKind: hold.kind },
        note: hold.releaseNote,
      });
    }
  }

  for (const a of source.activities) {
    events.push({
      key: `activity-${a.id}`,
      type: "ACTIVITY",
      at: iso(a.date),
      recordedAt: null,
      actor: a.actor,
      sequence: null,
      facts: { activityType: a.type, title: a.title },
      note: a.details,
    });
  }

  for (const a of source.attachments) {
    events.push({
      key: `attachment-${a.id}`,
      type: "ATTACHMENT",
      at: iso(a.createdAt),
      recordedAt: null,
      actor: a.actor,
      sequence: null,
      facts: { label: a.label || a.fileName, category: a.category },
      note: null,
    });
  }

  for (const s of source.shipments) {
    events.push({
      key: `shipment-${s.shipmentId}-${s.stateId ?? "line"}`,
      type: "SHIPMENT",
      at: iso(s.at),
      recordedAt: null,
      actor: s.actor,
      sequence: null,
      facts: { reference: s.reference, direction: s.direction, shipmentStatus: s.status },
      note: s.description,
      href: `/inventory/materials/${s.shipmentId}`,
    });
  }

  for (const t of source.tests) {
    events.push({
      key: `test-${t.id}`,
      type: "TEST",
      at: iso(t.testedAt),
      recordedAt: recordedAtIfLater(t.testedAt, t.createdAt),
      actor: t.actor,
      sequence: null,
      facts: {
        panel: t.panel,
        analyte: t.analyte,
        verdict: t.verdict,
        value: t.value,
        uom: t.uom,
        lab: t.labName,
      },
      note: t.comment,
    });
  }

  for (const i of source.incidents) {
    events.push({
      key: `incident-${i.id}`,
      type: "INCIDENT",
      at: iso(i.createdAt),
      recordedAt: null,
      actor: i.actor,
      sequence: null,
      facts: { severity: i.severity, title: i.title, incidentStatus: i.status },
      note: null,
      href: "/quality",
    });
  }

  for (const log of source.audits) {
    if (COVERED_AUDIT_ACTIONS.has(log.action) || log.action === "lineage") continue;
    events.push({
      key: `audit-${log.id}`,
      type: "AUDIT",
      at: iso(log.createdAt),
      recordedAt: null,
      actor: log.actor,
      sequence: null,
      facts: { action: log.action },
      note: log.summary,
    });
  }

  return events.sort(
    (a, b) =>
      new Date(b.at).getTime() - new Date(a.at).getTime() ||
      (b.sequence ?? 0) - (a.sequence ?? 0) ||
      a.key.localeCompare(b.key)
  );
}
