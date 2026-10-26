import type { SessionUser } from "@/lib/auth";
import {
  AUDIT_ACTIONS,
  daysAgo,
  EXPERIMENTS,
  matches,
  memberById,
  MEMBERS,
  slicePage,
  sortBy,
  UNITS,
} from "@/features/mock/data";

export const MEMBER_LIST_SORTS = ["name", "access", "experiments"] as const;
export const MEMBER_LIST_STATUSES = ["active", "invited", "deactivated"] as const;
export const MEMBER_LIST_ACCESS = ["ADMIN", "REGULAR"] as const;

type Status = (typeof MEMBER_LIST_STATUSES)[number];
type Access = (typeof MEMBER_LIST_ACCESS)[number];

export type MemberListRow = {
  id: number;
  name: string;
  email: string | null;
  access: Access;
  status: Status;
  inviteExpired: boolean;
  experimentCount: number;
  experimentCodes: string[];
  /** The first experiments with their ids, so each code can link to its page. */
  experimentRefs: Array<{ id: number; ecode: string }>;
};

const toRow = (m: (typeof MEMBERS)[number]): MemberListRow => {
  const exps = EXPERIMENTS.filter((e) => e.memberIds.includes(m.id));
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    access: m.permissions,
    status: m.status,
    inviteExpired: m.id === 4 && false,
    experimentCount: exps.length,
    experimentCodes: exps.slice(0, 2).map((e) => e.ecode),
    experimentRefs: exps.slice(0, 2).map((e) => ({ id: e.id, ecode: e.ecode })),
  };
};

export async function listMembers(
  viewer: SessionUser,
  f: {
    q?: string;
    status?: Status;
    access?: Access;
    sort: (typeof MEMBER_LIST_SORTS)[number];
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  const admin = viewer.permissions === "ADMIN";
  let rows = MEMBERS.map(toRow).filter(
    (m) =>
      (admin || m.status === "active") &&
      matches(f.q, m.name, admin ? m.email : null) &&
      (!f.status || m.status === f.status) &&
      (!f.access || m.access === f.access)
  );
  const key = {
    name: (m: MemberListRow) => m.name.toLowerCase(),
    access: (m: MemberListRow) => m.access,
    experiments: (m: MemberListRow) => m.experimentCount,
  }[f.sort];
  rows = sortBy(rows, key, f.order);
  return { rows: slicePage(rows, f.page, f.limit), total: rows.length };
}

export async function getMemberDetail(viewer: SessionUser, id: number) {
  const m = MEMBERS.find((x) => x.id === id);
  if (!m) return null;
  const admin = viewer.permissions === "ADMIN";
  const self = viewer.id === id;
  const exps = EXPERIMENTS.filter((e) => e.memberIds.includes(id));
  return {
    id: m.id,
    name: m.name,
    access: m.permissions as Access,
    status: m.status as Status,
    inviteExpired: false,
    admin: admin
      ? {
          email: m.email as string | null,
          createdAt: daysAgo(120),
          inviteExpiresAt: m.status === "invited" ? daysAgo(-3) : (null as Date | null),
        }
      : null,
    security:
      admin || self
        ? {
            mfaEnabled: m.permissions === "ADMIN",
            activeSessions: m.status === "active" ? 1 : 0,
            lastLoginAt: m.status === "invited" ? (null as Date | null) : daysAgo(m.id),
            passwordChangedAt: m.status === "invited" ? (null as Date | null) : daysAgo(30 + m.id),
          }
        : null,
    experiments: exps.map((e) => ({
      id: e.id,
      ecode: e.ecode,
      name: e.name,
      role: (e.leadId === id ? "LEAD" : "MEMBER") as "LEAD" | "MEMBER",
      endDate: e.endDate,
      units: UNITS.filter((u) => u.experimentId === e.id).length,
    })),
    activity: admin
      ? AUDIT_ACTIONS.filter((a) => a.actor === id)
          .slice(0, 5)
          .map((a, index) => ({ id: index + 1, summary: a.summary, createdAt: daysAgo(a.daysAgo) }))
      : null,
    resolvedViewer: memberById(viewer.id).name,
  };
}
export type MemberDetail = NonNullable<Awaited<ReturnType<typeof getMemberDetail>>>;
