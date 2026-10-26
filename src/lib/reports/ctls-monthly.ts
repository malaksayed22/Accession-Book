import { UnitStateKind } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";
import { buildCtlsLines, type FlowRow } from "./ctls-lines";
import { formatLabDate, labZone, monthPeriod } from "./date-range";
import { getInventoryEvents } from "./events";
import { getInventoryTotalsAtDate } from "./state-at-date";
import type { ReportFilters, ReportResult } from "./types";
import { env } from "@/server/env";

const FLOW_KINDS = [
  UnitStateKind.CREATED,
  UnitStateKind.RECEIVED,
  UnitStateKind.SHIPPED,
  UnitStateKind.DESTROYED,
];

/** Additions and reductions in `[start, endExclusive)`, summed in the database. */
async function getFlows(start: Date, endExclusive: Date): Promise<FlowRow[]> {
  return prisma.$queryRaw<FlowRow[]>`
    SELECT u."type"::text AS "unitType",
           s."kind"::text AS "kind",
           count(*)::int AS "units",
           coalesce(sum(s."humidWeight"), 0)::float8 AS "humidWeight",
           coalesce(sum(s."dryWeight"), 0)::float8 AS "dryWeight",
           coalesce(sum(s."seedCount"), 0)::float8 AS "seedCount"
    FROM "UnitState" s
    JOIN "BiologicalUnit" u ON u."id" = s."unitId"
    WHERE s."kind"::text = ANY(${FLOW_KINDS as string[]})
      AND s."effectiveAt" >= ${start}
      AND s."effectiveAt" < ${endExclusive}
    GROUP BY u."type", s."kind"`;
}

export async function generateCtlsMonthly(filters: ReportFilters): Promise<ReportResult> {
  const zone = labZone();
  const current = new Date();
  const [currentYear, currentMonth] = formatLabDate(current, zone).split("-").map(Number) as [
    number,
    number,
  ];
  const year = filters.year ?? currentYear;
  const month = filters.month ?? currentMonth;
  const { start, end, endExclusive, label } = monthPeriod(year, month, zone);
  const licenseId = filters.licenseId || env().LAB_LICENSE_ID || "—";

  // Opening = active in the last millisecond before the month; closing = active in its last one.
  const [opening, closing, flows, additionEvents, destructionEvents] = await Promise.all([
    getInventoryTotalsAtDate(new Date(start.getTime() - 1)),
    getInventoryTotalsAtDate(end),
    getFlows(start, endExclusive),
    getInventoryEvents({
      kinds: [UnitStateKind.CREATED, UnitStateKind.RECEIVED],
      from: start,
      to: endExclusive,
      newestFirst: false,
    }),
    getInventoryEvents({
      kinds: [UnitStateKind.DESTROYED],
      from: start,
      to: endExclusive,
      newestFirst: false,
    }),
  ]);

  const { lines, reconciles } = buildCtlsLines(opening, closing, flows);

  const shipped = flows
    .filter((f) => f.kind === UnitStateKind.SHIPPED)
    .reduce((sum, f) => sum + f.units, 0);
  const received = additionEvents.filter((e) => e.kind === UnitStateKind.RECEIVED).length;
  const derived = additionEvents.filter((e) => e.parentUnitName !== null).length;
  const activeAtClose = closing.reduce((sum, row) => sum + row.units, 0);

  return {
    meta: {
      reportId: "ctls-monthly",
      title: "CTLS Monthly Inventory Summary",
      generatedAt: new Date().toISOString(),
      periodLabel: label,
      licenseId,
      subtitle: "Research licence inventory reconciliation — adapted for laboratory tracking",
    },
    ctls: {
      lines,
      reconciles,
      reconciliationNotes: [
        `Months are calendar months in the laboratory time zone (${zone}). Dates are the effective date of each event, not the date it was filed.`,
        "Opening balances are the units active at the very start of the month (their newest effective event is not a shipment or destruction).",
        "Additions are CREATED and RECEIVED events effective in the month (registrations, derived clones and subcultures, external receipts), each counted once.",
        "Reductions are SHIPPED and DESTROYED events effective in the month.",
        reconciles
          ? "Reconciled: on every unit-count line, closing = opening + additions − reductions."
          : "NOT RECONCILED: closing differs from opening + additions − reductions on at least one unit-count line; investigate before filing.",
        "Seed and weight lines (flower units only) also report adjustments: the net change from re-measurement during the month. Closing = opening + additions − reductions + adjustments.",
        "Vegetative, flowering and other-stage rows show how the closing plant count is distributed; plant flows are on the total row.",
      ],
    },
    kpis: [
      { id: "activeAtClose", label: "Active units (closing)", value: activeAtClose },
      { id: "newUnits", label: "New units", value: additionEvents.length },
      { id: "destructions", label: "Destructions", value: destructionEvents.length },
      { id: "shipments", label: "Shipments", value: shipped },
      { id: "derivations", label: "Derivations", value: derived },
      { id: "externalReceipts", label: "External receipts", value: received },
      { id: "reconciled", label: "Reconciled", value: reconciles ? "Yes" : "No" },
    ],
    sections: [
      {
        id: "destruction-detail",
        title: "Destruction detail",
        columns: [
          { key: "date", label: "Date" },
          { key: "unit", label: "Unit" },
          { key: "type", label: "Type" },
          { key: "cultivar", label: "Cultivar" },
          { key: "experiment", label: "Experiment" },
          { key: "comment", label: "Notes" },
        ],
        rows: destructionEvents.map((d) => ({
          date: formatLabDate(d.effectiveAt, zone),
          unit: d.unitName,
          type: d.unitType,
          cultivar: d.cultivarName ?? "—",
          experiment: d.experimentCode ?? "—",
          comment: d.reason ?? "",
          _href: `/inventory/units/${d.unitId}`,
        })),
      },
      {
        id: "additions-detail",
        title: "Additions this month (source records)",
        description:
          "Each unit that entered inventory during the period — drill through to the live profile.",
        columns: [
          { key: "unit", label: "Unit" },
          { key: "type", label: "Type" },
          { key: "source", label: "Source" },
          { key: "cultivar", label: "Cultivar" },
          { key: "experiment", label: "Experiment" },
        ],
        rows: additionEvents.map((e) => ({
          unit: e.unitName,
          type: e.unitType,
          source: e.sourceType ?? "—",
          cultivar: e.cultivarName ?? "—",
          experiment: e.experimentCode ?? "—",
          _href: `/inventory/units/${e.unitId}`,
        })),
      },
    ],
  };
}
