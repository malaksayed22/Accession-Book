import type { SessionUser } from "@/lib/auth";
import {
  AUDIT_ACTIONS,
  daysAgo,
  matches,
  memberById,
  MEMBERS,
  slicePage,
} from "@/features/mock/data";

export type AuditChange = { field: string; from: string | null; to: string | null };

export type AuditEntryRow = {
  id: number;
  seq: number;
  createdAt: Date;
  actorId: number | null;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: number | null;
  entityLabel: string;
  summary: string;
  changes: AuditChange[];
  reason: string | null;
  requestId: string | null;
};

export type ChainStatus = {
  entries: number;
  verifiedAt: Date;
  firstBroken: {
    seq: number;
    kind: "sequenceGap" | "linkBroken" | "contentAltered" | "unknown";
  } | null;
};

const ALL: AuditEntryRow[] = AUDIT_ACTIONS.map((a, index) => {
  const actor = memberById(a.actor);
  return {
    id: index + 1,
    seq: index + 1,
    createdAt: new Date(daysAgo(a.daysAgo).getTime() - index * 61_000),
    actorId: actor.id,
    actorName: actor.name,
    actorRole: actor.permissions,
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    entityLabel: a.label,
    summary: a.summary,
    changes: a.changes ?? [],
    reason: a.reason ?? null,
    requestId: `req_${(1000 + index * 37).toString(16)}`,
  };
}).sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime());

export async function getAuditFilterOptions(_user: SessionUser) {
  return {
    actors: MEMBERS.map((m) => ({ id: m.id, name: m.name })),
    entityTypes: [...new Set(ALL.map((e) => e.entityType))],
    actions: [...new Set(ALL.map((e) => e.action))],
  };
}

export async function listAuditEntries(
  _user: SessionUser,
  filters: {
    q?: string;
    actorId?: number;
    entityType?: string;
    action?: string;
    from?: string;
    to?: string;
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  let rows = ALL.filter(
    (e) =>
      matches(filters.q, e.summary, e.entityLabel, e.actorName) &&
      (!filters.actorId || e.actorId === filters.actorId) &&
      (!filters.entityType || e.entityType === filters.entityType) &&
      (!filters.action || e.action === filters.action) &&
      (!filters.from || e.createdAt >= new Date(`${filters.from}T00:00:00`)) &&
      (!filters.to || e.createdAt <= new Date(`${filters.to}T23:59:59`))
  );
  if (filters.order === "asc") rows = [...rows].reverse();
  return { rows: slicePage(rows, filters.page, filters.limit), total: rows.length };
}

export async function verifyAuditChain(_user: SessionUser): Promise<ChainStatus> {
  return { entries: ALL.length, verifiedAt: new Date(), firstBroken: null };
}

export async function recentAuditEntries(limit: number): Promise<AuditEntryRow[]> {
  return ALL.slice(0, limit);
}
