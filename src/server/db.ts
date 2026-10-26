/* eslint-disable @typescript-eslint/no-explicit-any */
// MOCK: every model call resolves to "nothing found". The shape mirrors the real client closely
// enough that callbacks over query results are contextually typed rather than implicitly `any`.
type ModelStub = {
  findMany: (...args: any[]) => Promise<any[]>;
  findUnique: (...args: any[]) => Promise<any>;
};
type ModelName =
  "auditLog" | "biologicalUnit" | "experiment" | "experimentMember" | "location" | "user";
type PrismaStub = Record<ModelName, ModelStub> & {
  $queryRaw: <T = unknown>(...args: any[]) => Promise<T>;
  $transaction: (...args: any[]) => Promise<any>;
};

const model = new Proxy(
  {},
  {
    get: (_t, method) => async () =>
      String(method).startsWith("find") && method !== "findMany"
        ? null
        : method === "count"
          ? 0
          : [],
  }
);
export const prisma = new Proxy(
  {},
  { get: (_t, name) => (name === "$queryRaw" || name === "$transaction" ? async () => [] : model) }
) as PrismaStub;
