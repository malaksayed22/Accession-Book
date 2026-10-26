import type { SessionUser } from "@/lib/auth";
import {
  AUDIT_ACTIONS,
  EXPERIMENTS,
  HOLDS,
  INCIDENTS,
  isActiveUnit,
  LOCATIONS,
  SHIPMENTS,
  TESTS,
  UNITS,
} from "@/features/mock/data";
import { recentAuditEntries } from "@/features/audit/queries";
import type { AttentionKind } from "./attention";

export const ENDING_SOON_DAYS = 14;
/** How many days the activity chart covers, today included. */
export const ACTIVITY_DAYS = 30;

const DAY_MS = 86_400_000;
export const TEST_VERDICTS = ["PASS", "FAIL", "INCONCLUSIVE", "RECORDED"] as const;

export async function getDashboard(_user: SessionUser) {
  const now = Date.now();
  const running = EXPERIMENTS.filter((e) => !e.endDate || e.endDate.getTime() >= now);
  const active = UNITS.filter(isActiveUnit);

  const attention: Record<AttentionKind, number> = {
    failedTests: TESTS.filter((t) => t.verdict === "FAIL").length,
    onHold: HOLDS.length,
    openIncidents: INCIDENTS.filter((i) => i.status !== "CLOSED").length,
    overdueExperiments: EXPERIMENTS.filter((e) => e.endDate && e.endDate.getTime() < now).length,
    inconclusiveTests: TESTS.filter((t) => t.verdict === "INCONCLUSIVE").length,
    inTransit: SHIPMENTS.filter((s) => s.status === "IN_TRANSIT").length,
    endingSoonExperiments: running.filter(
      (e) => e.endDate && e.endDate.getTime() - now < ENDING_SOON_DAYS * 86_400_000
    ).length,
  };

  const count = <K extends string>(keyOf: (u: (typeof UNITS)[number]) => K) => {
    const map = new Map<K, number>();
    for (const u of active) map.set(keyOf(u), (map.get(keyOf(u)) ?? 0) + 1);
    return [...map.entries()]
      .map(([key, n]) => ({ key, count: n }))
      .sort((a, b) => b.count - a.count);
  };

  const byLocationAll = LOCATIONS.map((l) => ({
    id: l.id,
    name: l.name,
    capacity: l.capacity,
    count: active.filter((u) => u.locationId === l.id).length,
  }))
    .filter((l) => l.count > 0)
    .sort((a, b) => b.count - a.count);

  // Everything the lab recorded, by whole day and oldest first, so the chart reads left to right.
  const daysAgoOfEvents = [
    ...AUDIT_ACTIONS.map((entry) => entry.daysAgo),
    ...UNITS.map((unit) => unit.updatedDaysAgo),
    ...TESTS.map((test) => test.daysAgo),
    ...SHIPMENTS.map((shipment) => shipment.daysAgo),
    ...INCIDENTS.map((incident) => incident.createdDaysAgo),
  ];
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, index) => {
    const ago = ACTIVITY_DAYS - 1 - index;
    return {
      date: new Date(startOfToday - ago * DAY_MS),
      value: daysAgoOfEvents.filter((n) => n === ago).length,
    };
  });

  const results = TEST_VERDICTS.map((verdict) => ({
    verdict,
    count: TESTS.filter((test) => test.verdict === verdict).length,
  }));

  const locationsInUse = new Set(active.map((u) => u.locationId).filter((id) => id !== null));

  return {
    attention,
    activity,
    results,
    locations: {
      inUse: locationsInUse.size,
      total: LOCATIONS.filter((l) => l.active).length,
    },
    runningExperimentCount: running.length,
    runningExperiments: running.slice(0, 5).map((e) => ({
      id: e.id,
      ecode: e.ecode,
      name: e.name,
      endDate: e.endDate,
      activeUnits: active.filter((u) => u.experimentId === e.id).length,
    })),
    recent: {
      kind: "audit" as const,
      entries: await recentAuditEntries(6),
    },
    inventory: {
      total: active.length,
      byType: count((u) => u.type),
      byStage: count((u) => u.stage ?? "NONE"),
      byLocation: byLocationAll.slice(0, 5),
      unlocated: active.filter((u) => u.locationId === null).length,
      otherLocations: {
        locations: Math.max(0, byLocationAll.length - 5),
        units: byLocationAll.slice(5).reduce((sum, l) => sum + l.count, 0),
      },
    },
  };
}
