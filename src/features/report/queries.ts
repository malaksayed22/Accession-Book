import type { SessionUser } from "@/lib/auth";
import type { CtlsLine, ReportFilters, ReportResult, ReportSection } from "@/lib/reports/types";
import {
  AUDIT_ACTIONS,
  cultivarById,
  daysAgo,
  EXPERIMENTS,
  experimentById,
  locationById,
  LOCATIONS,
  memberById,
  organizationById,
  SHIPMENTS,
  unitById,
  UNITS,
} from "@/features/mock/data";
import { auditEntityHref } from "@/features/audit/links";
import { getReportMeta } from "@/lib/report-catalog";

export async function loadReportFilterOptions(_user: SessionUser) {
  return {
    experiments: EXPERIMENTS.map((e) => ({ id: e.id, ecode: e.ecode, name: e.name })),
    locations: LOCATIONS.map((l) => ({ id: l.id, name: l.name })),
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

const unitRows = (filters: ReportFilters) =>
  UNITS.filter(
    (u) =>
      (!filters.experimentId || u.experimentId === filters.experimentId) &&
      (!filters.unitType || u.type === filters.unitType) &&
      (!filters.locationId || u.locationId === filters.locationId)
  );

const ctlsLines = (): CtlsLine[] => {
  const plants = UNITS.filter((u) => u.type === "PLANT").length;
  const cultures = UNITS.filter((u) => u.type === "CULTURE").length;
  const seedlots = UNITS.filter((u) => u.type === "SEEDLOT").length;
  const line = (
    lineId: string,
    label: string,
    closing: number,
    additions: number,
    reductions: number,
    extra: Partial<CtlsLine> = {}
  ): CtlsLine => ({
    lineId,
    label,
    indent: 0,
    unit: "units",
    opening: closing - additions + reductions,
    additions,
    reductions,
    closing,
    reconciles: true,
    ...extra,
  });
  return [
    line("plants-total", "Plants (total)", plants, 6, 2, { isTotal: true }),
    line("plants-vegetative", "Vegetative", 6, 4, 1, { indent: 1 }),
    line("plants-flowering", "Flowering", 5, 2, 1, { indent: 1 }),
    line("cultures-total", "Cultures", cultures, 2, 0, { isTotal: true }),
    line("seedlots-total", "Seed lots", seedlots, 2, 0, { isTotal: true }),
  ];
};

function sectionFor(id: string, filters: ReportFilters): ReportSection {
  switch (id) {
    case "destruction-register":
      return {
        id: "destruction-register",
        title: "Destruction register",
        columns: [
          { key: "unit", label: "Unit" },
          { key: "type", label: "Type" },
          { key: "destroyedOn", label: "Destroyed on" },
          { key: "reason", label: "Reason" },
          { key: "witness", label: "Witness" },
        ],
        rows: UNITS.filter((u) => u.status === "destroyed").map((u) => ({
          _href: `/inventory/units/${u.id}`,
          "_href:witness": "/records/members/3",
          unit: u.name,
          type: u.type,
          destroyedOn: iso(daysAgo(u.updatedDaysAgo)),
          reason: u.id === 15 ? "Failed microbial panel." : "Surplus after study close-out.",
          witness: memberById(3).name,
        })),
      };
    case "transfer-log":
      return {
        id: "transfer-log",
        title: "Transfer log",
        columns: [
          { key: "reference", label: "Reference" },
          { key: "direction", label: "Direction" },
          { key: "organization", label: "Organization" },
          { key: "date", label: "Date" },
          { key: "status", label: "Status" },
        ],
        rows: SHIPMENTS.map((s) => ({
          "_href:reference": `/inventory/materials/${s.id}`,
          "_href:organization": `/records/organizations/${s.organizationId}`,
          reference: s.reference,
          direction: s.direction,
          organization: organizationById(s.organizationId)!.name,
          date: iso(daysAgo(s.daysAgo)),
          status: s.status,
        })),
      };
    case "experiment-summary":
      return {
        id: "experiment-summary",
        title: "Experiment summary",
        columns: [
          { key: "code", label: "Code" },
          { key: "name", label: "Name" },
          { key: "start", label: "Start" },
          { key: "end", label: "End" },
          { key: "units", label: "Units", align: "right" },
        ],
        rows: EXPERIMENTS.map((e) => ({
          "_href:code": `/inventory/experiments/${e.id}`,
          "_href:name": `/inventory/experiments/${e.id}`,
          "_href:units": `/inventory/experiments/${e.id}`,
          code: e.ecode,
          name: e.name,
          start: iso(e.startDate),
          end: e.endDate ? iso(e.endDate) : null,
          units: UNITS.filter((u) => u.experimentId === e.id).length,
        })),
      };
    case "activity-audit":
      return {
        id: "activity-audit",
        title: "Activity audit",
        columns: [
          { key: "when", label: "When" },
          { key: "actor", label: "Actor" },
          { key: "action", label: "Action" },
          { key: "entity", label: "Record" },
          { key: "summary", label: "Summary" },
        ],
        rows: AUDIT_ACTIONS.map((a) => ({
          "_href:actor": `/records/members/${a.actor}`,
          ...(auditEntityHref(a.entityType, a.entityId)
            ? { "_href:entity": auditEntityHref(a.entityType, a.entityId) }
            : {}),
          "_href:action": `/compliance/audit?action=${a.action}`,
          when: iso(daysAgo(a.daysAgo)),
          actor: memberById(a.actor).name,
          action: a.action,
          entity: a.label,
          summary: a.summary,
        })),
      };
    default:
      return {
        id,
        title: "Inventory",
        columns: [
          { key: "unit", label: "Unit" },
          { key: "type", label: "Type" },
          { key: "cultivar", label: "Cultivar" },
          { key: "experiment", label: "Experiment" },
          { key: "location", label: "Location" },
          { key: "status", label: "Status" },
        ],
        rows: unitRows(filters).map((u) => ({
          _href: `/inventory/units/${u.id}`,
          ...(u.cultivarId ? { "_href:cultivar": `/records/cultivars/${u.cultivarId}` } : {}),
          ...(u.experimentId
            ? { "_href:experiment": `/inventory/experiments/${u.experimentId}` }
            : {}),
          ...(u.locationId
            ? { "_href:location": `/inventory/units?location=${u.locationId}` }
            : {}),
          unit: u.name,
          type: u.type,
          cultivar: cultivarById(u.cultivarId)?.name ?? null,
          experiment: experimentById(u.experimentId)?.ecode ?? null,
          location: locationById(u.locationId)?.name ?? null,
          status: u.status,
        })),
      };
  }
}

export async function loadReport(
  _user: SessionUser,
  slug: string,
  filters: ReportFilters
): Promise<ReportResult> {
  const meta = getReportMeta(slug);
  const generatedAt = new Date().toISOString();
  const base = {
    reportId: slug,
    title: slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()),
    generatedAt,
    licenseId: filters.licenseId ?? "LIC-MOCK-0001",
  };
  if (slug === "ctls-monthly") {
    return {
      meta: base,
      sections: [],
      ctls: { lines: ctlsLines(), reconciles: true, reconciliationNotes: [] },
      kpis: [
        {
          label: "Active units",
          value: UNITS.filter((u) => u.status !== "shipped" && u.status !== "destroyed").length,
        },
        { label: "Shipments", value: SHIPMENTS.length },
      ],
    };
  }
  const section = sectionFor(meta?.id ?? slug, filters);
  return {
    meta: base,
    sections: [section],
    kpis: [{ label: "Records", value: section.rows.length }],
  };
}
