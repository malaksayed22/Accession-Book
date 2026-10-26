export const ATTENTION_PRIORITY = [
  "failedTests",
  "onHold",
  "openIncidents",
  "overdueExperiments",
  "inconclusiveTests",
  "inTransit",
  "endingSoonExperiments",
] as const;
export type AttentionKind = (typeof ATTENTION_PRIORITY)[number];

export const ATTENTION_HREF: Record<AttentionKind, string> = {
  failedTests: "/quality?view=tests&verdict=FAIL",
  onHold: "/quality?view=holds",
  openIncidents: "/quality?view=incidents",
  overdueExperiments: "/inventory/experiments?status=running",
  inconclusiveTests: "/quality?view=tests&verdict=INCONCLUSIVE",
  inTransit: "/inventory/materials?status=IN_TRANSIT",
  endingSoonExperiments: "/inventory/experiments?status=running&sort=end&order=asc",
};

/** The most urgent open item, or null when nothing needs attention. */
export function nextBestStep(
  attention: Record<AttentionKind, number>
): { kind: AttentionKind; count: number; href: string } | null {
  for (const kind of ATTENTION_PRIORITY) {
    const count = attention[kind];
    if (count > 0) return { kind, count, href: ATTENTION_HREF[kind] };
  }
  return null;
}
