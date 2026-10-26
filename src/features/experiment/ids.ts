/** A positive integer record id from a route or query value, or undefined. */
export function recordIdParam(value: string | undefined | null): number | undefined {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}
