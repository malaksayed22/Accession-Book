import type { SessionUser } from "@/lib/auth";
import {
  buildFinding,
  FINDING_IDS,
  summarizeFindings,
  type ComplianceFinding,
  type FindingId,
  type Offender,
} from "@/lib/compliance";
import type { ChainStatus } from "@/features/audit/queries";
import { verifyAuditChain } from "@/features/audit/queries";
import { HOLDS, INCIDENTS, SHIPMENTS, TESTS, unitById, UNITS } from "@/features/mock/data";

export type ReconciliationLine = {
  lineId: "plants-total" | "cultures-total" | "seedlots-total";
  opening: number;
  additions: number;
  reductions: number;
  closing: number;
  reconciles: boolean;
};

export type CtlsMonthStatus = {
  year: number;
  month: number;
  reconciles: boolean;
  lines: ReconciliationLine[];
  activeAtClose: number;
  newUnits: number;
  destructions: number;
  shipments: number;
};

const monthStatus = (offset: number): CtlsMonthStatus => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + offset, 1);
  const plants = UNITS.filter((u) => u.type === "PLANT" || u.type === "FLOWER").length;
  const cultures = UNITS.filter((u) => u.type === "CULTURE").length;
  const seeds = UNITS.filter((u) => u.type === "SEEDLOT").length;
  const line = (lineId: ReconciliationLine["lineId"], closing: number, additions: number, reductions: number): ReconciliationLine => ({
    lineId,
    opening: closing - additions + reductions,
    additions,
    reductions,
    closing,
    reconciles: true,
  });
  const lines = [
    line("plants-total", plants - offset * 2, 6 + offset, 3),
    line("cultures-total", cultures, 2, 0),
    line("seedlots-total", seeds, 2 + offset, 0),
  ];
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    reconciles: lines.every((l) => l.reconciles),
    lines,
    activeAtClose: lines.reduce((sum, l) => sum + l.closing, 0),
    newUnits: lines.reduce((sum, l) => sum + l.additions, 0),
    destructions: 2,
    shipments: SHIPMENTS.filter((s) => s.direction === "OUTBOUND" && s.status !== "CANCELLED").length,
  };
};

const offender = (id: number, label: string, key: Offender["detail"]["key"], params: Record<string, string | number>): Offender => ({
  id,
  label,
  href: `/inventory/units/${id}`,
  detail: { key, params },
});

export async function getComplianceConsole(_user: SessionUser) {
  const open: Partial<Record<FindingId, Offender[]>> = {
    "transfers-scanned": [
      { id: 2, label: "BD-002", href: "/inventory/units/2", detail: { key: "movedWithoutScan", params: { location: "Flower Room 1" } } },
    ],
    "quality-holds": HOLDS.map((h) => offender(h.unitId, unitById(h.unitId)!.name, "hold", { kind: h.kind, reason: h.reason })),
    "failed-tests": TESTS.filter((t) => t.verdict === "FAIL").map((t) =>
      offender(t.unitId, unitById(t.unitId)!.name, "testFailed", { panel: t.panel, analyte: t.analyte })
    ),
    "open-incidents": INCIDENTS.filter((i) => i.status !== "CLOSED").map((i) =>
      offender(i.unitId, unitById(i.unitId)!.name, "incident", { severity: i.severity, title: i.title })
    ),
    "experiment-attribution": UNITS.filter((u) => u.experimentId === null).map((u) =>
      offender(u.id, u.name, "noExperiment", {})
    ),
  };
  const findings: ComplianceFinding[] = FINDING_IDS.map((id) => {
    const offenders = open[id] ?? [];
    return buildFinding(id, offenders.length, offenders);
  });
  const chain: ChainStatus = await verifyAuditChain(_user);
  return {
    checks: summarizeFindings(findings, new Date()),
    previousMonth: monthStatus(-1),
    currentMonth: monthStatus(0),
    destruction: {
      total: UNITS.filter((u) => u.status === "destroyed").length,
      last30Days: UNITS.filter((u) => u.status === "destroyed" && u.updatedDaysAgo <= 30).length,
      lastDestroyedAt: new Date(Date.now() - 28 * 86_400_000) as Date | null,
      undocumented: 0,
      filedLate: 0,
    },
    chain,
  };
}
