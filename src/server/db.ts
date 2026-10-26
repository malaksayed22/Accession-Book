/* eslint-disable @typescript-eslint/no-explicit-any */
// MOCK: every model call resolves to "nothing found".
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
export const prisma: any = new Proxy(
  {},
  { get: (_t, name) => (name === "$queryRaw" || name === "$transaction" ? async () => [] : model) }
);
