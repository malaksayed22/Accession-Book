import { daysAgo, MEMBERS } from "@/features/mock/data";

export async function getProfileSummary(userId: number) {
  const m = MEMBERS.find((x) => x.id === userId) ?? MEMBERS[0]!;
  return {
    initials: m.name
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .join("")
      .slice(0, 3)
      .toUpperCase(),
    email: m.email as string | null,
    memberSince: daysAgo(120),
    mfaEnabled: false,
  };
}

/** The pending invitation behind a link, or null when it is unknown or expired. */
export async function getInviteLanding(token: string) {
  if (token === "expired") return null;
  const m = MEMBERS.find((x) => x.status === "invited") ?? MEMBERS[3]!;
  return { name: m.name, permissions: m.permissions };
}
