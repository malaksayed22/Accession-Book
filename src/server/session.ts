// MOCK: any non-empty session cookie is a signed-in admin.
export type ResolvedSession = {
  state: "active" | "mfa-required" | "mfa-enrolment-required";
  user: { id: number; name: string; permissions: "ADMIN" | "REGULAR" };
};

export async function resolveSession(token: string | undefined): Promise<ResolvedSession | null> {
  if (!token) return null;
  return { state: "active", user: { id: 1, name: "admin", permissions: "ADMIN" } };
}
