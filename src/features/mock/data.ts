// MOCK DATA: one small in-memory lab shared by every mock query module.
const DAY = 86_400_000;
export const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
export const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);

export type MockUnitType = "PLANT" | "SEEDLOT" | "FLOWER" | "CULTURE";
export type MockStatus = "active" | "on-hold" | "quarantine" | "shipped" | "destroyed";

export const MEMBERS = [
  { id: 1, name: "admin", email: "admin@example.com", permissions: "ADMIN" as const, status: "active" as const },
  { id: 2, name: "Dr. Sarah Chen", email: "sarah.chen@example.com", permissions: "REGULAR" as const, status: "active" as const },
  { id: 3, name: "Marcus Webb", email: "marcus.webb@example.com", permissions: "REGULAR" as const, status: "active" as const },
  { id: 4, name: "Priya Patel", email: "priya.patel@example.com", permissions: "REGULAR" as const, status: "invited" as const },
  { id: 5, name: "Tom Okafor", email: "tom.okafor@example.com", permissions: "REGULAR" as const, status: "deactivated" as const },
];

export const LOCATIONS = [
  { id: 1, name: "Vault A", address: "Building 1, Secure wing", comment: "Controlled-access storage.", capacity: 40 as number | null, active: true },
  { id: 2, name: "Flower Room 1", address: "Building 2, Level 1", comment: null as string | null, capacity: 24 as number | null, active: true },
  { id: 3, name: "Veg Room 2", address: "Building 2, Level 1", comment: "Mother plants and clones.", capacity: 60 as number | null, active: true },
  { id: 4, name: "Drying Room", address: "Building 2, Level 2", comment: null as string | null, capacity: 12 as number | null, active: true },
  { id: 5, name: "Tissue Culture Lab", address: "Building 3, Lab 4", comment: "Sterile bench work.", capacity: null as number | null, active: true },
  { id: 6, name: "Old Greenhouse", address: "North field", comment: "Decommissioned.", capacity: 30 as number | null, active: false },
];

export const CULTIVARS = [
  { id: 1, name: "Blue Dream", code: "BD" as string | null, commonName: "Azure Haze" as string | null, category: "Hybrid" as string | null, targetThc: 2100 as number | null, targetCbd: 50 as number | null, comment: "Balanced sativa-leaning hybrid. Vigorous in veg." as string | null },
  { id: 2, name: "OG Kush", code: "OGK", commonName: null, category: "Indica", targetThc: 2400, targetCbd: 30, comment: "Dense, resinous flowers." },
  { id: 3, name: "Northern Lights", code: "NL", commonName: "NL #5", category: "Indica", targetThc: 1900, targetCbd: 80, comment: null },
  { id: 4, name: "Sour Diesel", code: "SD", commonName: null, category: "Sativa", targetThc: 2200, targetCbd: 20, comment: "Long flowering window." },
  { id: 5, name: "Cannatonic", code: "CAN", commonName: null, category: "CBD", targetThc: 600, targetCbd: 1700, comment: "High-CBD line for the wellness trial." },
  { id: 6, name: "Reserve Genetics", code: null, commonName: null, category: null, targetThc: null, targetCbd: null, comment: null },
];

export const EXPERIMENTS = [
  { id: 1, ecode: "EXP-2026-001", name: "Spring cultivar trial", comment: "Compare yield across five cultivars under identical light." as string | null, startDate: daysAgo(70), endDate: daysFromNow(21) as Date | null, parentId: null as number | null, leadId: 2, memberIds: [2, 3, 1] },
  { id: 2, ecode: "EXP-2026-002", name: "Low-light flowering", comment: "Reduced photoperiod and its effect on terpene content.", startDate: daysAgo(40), endDate: daysFromNow(5), parentId: 1, leadId: 3, memberIds: [3, 2] },
  { id: 3, ecode: "EXP-2026-003", name: "CBD tissue-culture lines", comment: null, startDate: daysAgo(25), endDate: null, parentId: null, leadId: 2, memberIds: [2] },
  { id: 4, ecode: "EXP-2025-014", name: "Autumn drying study", comment: "Closed out with the destruction register filed.", startDate: daysAgo(210), endDate: daysAgo(30), parentId: null, leadId: 1, memberIds: [1, 3] },
  { id: 5, ecode: "EXP-2026-004", name: "Nutrient regime audit", comment: null, startDate: daysAgo(90), endDate: daysAgo(4), parentId: null, leadId: 3, memberIds: [3] },
];

export type MockUnit = {
  id: number;
  name: string;
  type: MockUnitType;
  cultivarId: number | null;
  experimentId: number | null;
  locationId: number | null;
  status: MockStatus;
  stage: string | null;
  parentId: number | null;
  updatedDaysAgo: number;
  humidWeight: number | null;
  dryWeight: number | null;
  sex?: string;
};

export const UNITS: MockUnit[] = [
  { id: 1, name: "BD-001", type: "PLANT", cultivarId: 1, experimentId: 1, locationId: 2, status: "active", stage: "FLOWERING", parentId: null, updatedDaysAgo: 1, humidWeight: null, dryWeight: null, sex: "FEMALE" },
  { id: 2, name: "BD-002", type: "PLANT", cultivarId: 1, experimentId: 1, locationId: 2, status: "active", stage: "FLOWERING", parentId: 1, updatedDaysAgo: 2, humidWeight: null, dryWeight: null, sex: "FEMALE" },
  { id: 3, name: "BD-003", type: "PLANT", cultivarId: 1, experimentId: 1, locationId: 3, status: "on-hold", stage: "VEGETATIVE", parentId: 1, updatedDaysAgo: 3, humidWeight: null, dryWeight: null, sex: "FEMALE" },
  { id: 4, name: "OGK-001", type: "PLANT", cultivarId: 2, experimentId: 1, locationId: 3, status: "active", stage: "VEGETATIVE", parentId: null, updatedDaysAgo: 4, humidWeight: null, dryWeight: null, sex: "FEMALE" },
  { id: 5, name: "OGK-002", type: "PLANT", cultivarId: 2, experimentId: 1, locationId: 2, status: "quarantine", stage: "FLOWERING", parentId: 4, updatedDaysAgo: 1, humidWeight: null, dryWeight: null, sex: "FEMALE" },
  { id: 6, name: "NL-001", type: "PLANT", cultivarId: 3, experimentId: 2, locationId: 2, status: "active", stage: "FLOWERING", parentId: null, updatedDaysAgo: 6, humidWeight: null, dryWeight: null, sex: "FEMALE" },
  { id: 7, name: "NL-F-001", type: "FLOWER", cultivarId: 3, experimentId: 2, locationId: 4, status: "active", stage: "DRYING", parentId: 6, updatedDaysAgo: 2, humidWeight: 412.5, dryWeight: null },
  { id: 8, name: "SD-F-001", type: "FLOWER", cultivarId: 4, experimentId: 2, locationId: 1, status: "active", stage: "CURING", parentId: null, updatedDaysAgo: 9, humidWeight: 530, dryWeight: 118.25 },
  { id: 9, name: "SD-F-002", type: "FLOWER", cultivarId: 4, experimentId: 2, locationId: 1, status: "shipped", stage: "STORAGE", parentId: null, updatedDaysAgo: 12, humidWeight: 500, dryWeight: 101.8 },
  { id: 10, name: "CAN-C-001", type: "CULTURE", cultivarId: 5, experimentId: 3, locationId: 5, status: "active", stage: "CULTURE", parentId: null, updatedDaysAgo: 5, humidWeight: null, dryWeight: null },
  { id: 11, name: "CAN-C-002", type: "CULTURE", cultivarId: 5, experimentId: 3, locationId: 5, status: "active", stage: "CULTURE", parentId: 10, updatedDaysAgo: 5, humidWeight: null, dryWeight: null },
  { id: 12, name: "CAN-C-003", type: "CULTURE", cultivarId: 5, experimentId: 3, locationId: 5, status: "on-hold", stage: "CULTURE", parentId: 10, updatedDaysAgo: 7, humidWeight: null, dryWeight: null },
  { id: 13, name: "BD-S-001", type: "SEEDLOT", cultivarId: 1, experimentId: null, locationId: 1, status: "active", stage: "SEED", parentId: null, updatedDaysAgo: 30, humidWeight: null, dryWeight: null },
  { id: 14, name: "OGK-S-001", type: "SEEDLOT", cultivarId: 2, experimentId: null, locationId: 1, status: "active", stage: "SEED", parentId: null, updatedDaysAgo: 31, humidWeight: null, dryWeight: null },
  { id: 15, name: "NL-002", type: "PLANT", cultivarId: 3, experimentId: 4, locationId: null, status: "destroyed", stage: "HARVESTED", parentId: null, updatedDaysAgo: 28, humidWeight: null, dryWeight: null },
  { id: 16, name: "SD-001", type: "PLANT", cultivarId: 4, experimentId: 4, locationId: null, status: "destroyed", stage: "HARVESTED", parentId: null, updatedDaysAgo: 29, humidWeight: null, dryWeight: null },
  { id: 17, name: "OGK-F-001", type: "FLOWER", cultivarId: 2, experimentId: 4, locationId: null, status: "shipped", stage: "STORAGE", parentId: null, updatedDaysAgo: 33, humidWeight: 300, dryWeight: 66 },
  { id: 18, name: "BD-004", type: "PLANT", cultivarId: 1, experimentId: 5, locationId: 3, status: "active", stage: "VEGETATIVE", parentId: 1, updatedDaysAgo: 8, humidWeight: null, dryWeight: null, sex: "FEMALE" },
  { id: 19, name: "BD-005", type: "PLANT", cultivarId: 1, experimentId: 5, locationId: 3, status: "active", stage: "VEGETATIVE", parentId: 1, updatedDaysAgo: 8, humidWeight: null, dryWeight: null, sex: "FEMALE" },
  { id: 20, name: "NL-003", type: "PLANT", cultivarId: 3, experimentId: 2, locationId: 2, status: "active", stage: "FLOWERING", parentId: 6, updatedDaysAgo: 3, humidWeight: null, dryWeight: null, sex: "FEMALE" },
];

export const ORGANIZATIONS = [
  { id: 1, name: "Northern Genetics Inc.", country: "CA", licence: "LIC-CA-5521", relation: "SUPPLIER" as string, contact: "Jordan Lee", email: "orders@northerngenetics.example", phone: "+1 416 555 0142" as string | null, address: "12 Maple St, Toronto, ON", comment: "Primary seed and clone supplier." as string | null },
  { id: 2, name: "Maple Leaf Laboratories", country: "CA", licence: "LIC-CA-7710", relation: "LAB", contact: "Dr. Anika Rao", email: "results@mapleleaf.example", phone: "+1 613 555 0107", address: "88 Rideau Rd, Ottawa, ON", comment: null },
  { id: 3, name: "Evergreen Wellness", country: "CA", licence: "LIC-CA-9033", relation: "CUSTOMER", contact: "Sam Duval", email: "sam@evergreen.example", phone: null, address: "5 Rue Notre-Dame, Montreal, QC", comment: null },
  { id: 4, name: "Alpine Botanicals GmbH", country: "DE", licence: "BTM-DE-0042", relation: "CUSTOMER", contact: "Lena Fischer", email: "lena@alpine.example", phone: "+49 30 555 0123", address: "Linienstrasse 4, Berlin", comment: "Export permit on file." },
];

export type MockShipment = {
  id: number;
  reference: string;
  direction: "INBOUND" | "OUTBOUND";
  status: "DRAFT" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  organizationId: number;
  daysAgo: number;
  tracking: string | null;
  manifest: string | null;
  units: number[];
};

export const SHIPMENTS: MockShipment[] = [
  { id: 1, reference: "IN-2026-0007", direction: "INBOUND", status: "DELIVERED", organizationId: 1, daysAgo: 60, tracking: "1Z999AA10123456784", manifest: "MAN-88341", units: [13, 14] },
  { id: 2, reference: "OUT-2026-0003", direction: "OUTBOUND", status: "DELIVERED", organizationId: 3, daysAgo: 12, tracking: "1Z999AA10123456791", manifest: "MAN-88512", units: [9] },
  { id: 3, reference: "OUT-2026-0004", direction: "OUTBOUND", status: "IN_TRANSIT", organizationId: 4, daysAgo: 2, tracking: "DE-4412-0098", manifest: "MAN-88790", units: [17] },
  { id: 4, reference: "IN-2026-0008", direction: "INBOUND", status: "DRAFT", organizationId: 1, daysAgo: 0, tracking: null, manifest: null, units: [] },
  { id: 5, reference: "OUT-2026-0001", direction: "OUTBOUND", status: "CANCELLED", organizationId: 3, daysAgo: 45, tracking: null, manifest: null, units: [] },
];

export type MockAudit = {
  action: string;
  entityType: string;
  entityId: number;
  label: string;
  summary: string;
  actor: number;
  daysAgo: number;
  changes?: Array<{ field: string; from: string | null; to: string | null }>;
  reason?: string;
};

export const AUDIT_ACTIONS: MockAudit[] = [
  { action: "login", entityType: "auth", entityId: 1, label: "admin", summary: "Signed in", actor: 1, daysAgo: 0 },
  { action: "create", entityType: "unit", entityId: 19, label: "BD-005", summary: "Registered plant BD-005", actor: 3, daysAgo: 8 },
  { action: "stage_transition", entityType: "unit", entityId: 1, label: "BD-001", summary: "Stage changed to Flowering", actor: 2, daysAgo: 1, changes: [{ field: "stage", from: "VEGETATIVE", to: "FLOWERING" }] },
  { action: "transfer", entityType: "unit", entityId: 2, label: "BD-002", summary: "Moved to Flower Room 1", actor: 2, daysAgo: 2, changes: [{ field: "location", from: "Veg Room 2", to: "Flower Room 1" }] },
  { action: "hold", entityType: "unit", entityId: 3, label: "BD-003", summary: "Placed on hold", actor: 1, daysAgo: 3, reason: "Awaiting pesticide panel result." },
  { action: "lab_test", entityType: "unit", entityId: 5, label: "OGK-002", summary: "Pesticides panel: failed", actor: 2, daysAgo: 1 },
  { action: "hold", entityType: "unit", entityId: 5, label: "OGK-002", summary: "Quarantined after failed test", actor: 1, daysAgo: 1, reason: "Automatic: failed lab test." },
  { action: "incident_open", entityType: "incident", entityId: 1, label: "Mould on tray 4", summary: "Opened a major incident", actor: 3, daysAgo: 5 },
  { action: "ship", entityType: "shipment", entityId: 3, label: "OUT-2026-0004", summary: "Shipment marked in transit", actor: 1, daysAgo: 2 },
  { action: "destroy", entityType: "unit", entityId: 15, label: "NL-002", summary: "Destroyed 112 g of trim", actor: 1, daysAgo: 28, reason: "Failed microbial panel." },
  { action: "create", entityType: "experiment", entityId: 3, label: "EXP-2026-003", summary: "Created experiment", actor: 2, daysAgo: 25 },
  { action: "update", entityType: "experiment", entityId: 2, label: "EXP-2026-002", summary: "Updated experiment", actor: 3, daysAgo: 10, changes: [{ field: "endDate", from: "2026-11-02", to: "2026-11-20" }] },
  { action: "invite", entityType: "member", entityId: 4, label: "Priya Patel", summary: "Invited a member", actor: 1, daysAgo: 4 },
  { action: "deactivate", entityType: "member", entityId: 5, label: "Tom Okafor", summary: "Deactivated a member", actor: 1, daysAgo: 20 },
  { action: "create", entityType: "organization", entityId: 4, label: "Alpine Botanicals GmbH", summary: "Registered an organization", actor: 1, daysAgo: 50 },
  { action: "measure", entityType: "unit", entityId: 8, label: "SD-F-001", summary: "Recorded dry weight 118.25 g", actor: 3, daysAgo: 9 },
];

export const INCIDENTS = [
  { id: 1, title: "Mould on tray 4", severity: "MAJOR" as "CRITICAL" | "MAJOR" | "MINOR", status: "OPEN" as "OPEN" | "INVESTIGATING" | "CLOSED", unitId: 3, description: "White mould spotted on lower canopy.", createdDaysAgo: 5, reporterId: 3 },
  { id: 2, title: "Humidity excursion in Drying Room", severity: "MINOR" as const, status: "INVESTIGATING" as const, unitId: 7, description: "RH exceeded 65% for four hours.", createdDaysAgo: 9, reporterId: 2 },
  { id: 3, title: "Unlabelled tray found", severity: "CRITICAL" as const, status: "CLOSED" as const, unitId: 12, description: "Tray located and relabelled; no loss.", createdDaysAgo: 40, reporterId: 1 },
];

export type MockVerdict = "PASS" | "FAIL" | "INCONCLUSIVE" | "RECORDED";
export const TESTS: Array<{ id: number; unitId: number; panel: string; analyte: string; value: number | null; uom: string | null; verdict: MockVerdict; labId: number; daysAgo: number }> = [
  { id: 1, unitId: 5, panel: "PESTICIDES", analyte: "Myclobutanil", value: 0.42, uom: "ppm", verdict: "FAIL", labId: 2, daysAgo: 1 },
  { id: 2, unitId: 8, panel: "POTENCY", analyte: "THC", value: 22.4, uom: "%", verdict: "PASS", labId: 2, daysAgo: 8 },
  { id: 3, unitId: 8, panel: "POTENCY", analyte: "CBD", value: 0.4, uom: "%", verdict: "PASS", labId: 2, daysAgo: 8 },
  { id: 4, unitId: 7, panel: "MICROBIALS", analyte: "Total yeast and mould", value: null, uom: null, verdict: "INCONCLUSIVE", labId: 2, daysAgo: 2 },
  { id: 5, unitId: 15, panel: "MICROBIALS", analyte: "Salmonella", value: null, uom: null, verdict: "FAIL", labId: 2, daysAgo: 30 },
  { id: 6, unitId: 3, panel: "PESTICIDES", analyte: "Bifenazate", value: null, uom: null, verdict: "RECORDED", labId: 2, daysAgo: 3 },
  { id: 7, unitId: 9, panel: "MOISTURE", analyte: "Water activity", value: 0.58, uom: "aw", verdict: "PASS", labId: 2, daysAgo: 14 },
];

export const HOLDS = [
  { id: 1, unitId: 3, kind: "HOLD" as "HOLD" | "QUARANTINE", origin: "MANUAL" as "MANUAL" | "AUTO_TEST" | "AUTO_INCIDENT", reason: "Awaiting pesticide panel result.", placedDaysAgo: 3, actorId: 1 },
  { id: 2, unitId: 5, kind: "QUARANTINE" as const, origin: "AUTO_TEST" as const, reason: "Failed pesticides panel.", placedDaysAgo: 1, actorId: 1 },
  { id: 3, unitId: 12, kind: "HOLD" as const, origin: "MANUAL" as const, reason: "Contamination check on culture.", placedDaysAgo: 7, actorId: 2 },
];

export const memberById = (id: number) => MEMBERS.find((m) => m.id === id) ?? MEMBERS[0]!;
export const locationById = (id: number | null) => LOCATIONS.find((l) => l.id === id) ?? null;
export const cultivarById = (id: number | null) => CULTIVARS.find((c) => c.id === id) ?? null;
export const experimentById = (id: number | null) => EXPERIMENTS.find((e) => e.id === id) ?? null;
export const organizationById = (id: number | null) => ORGANIZATIONS.find((o) => o.id === id) ?? null;
export const unitById = (id: number) => UNITS.find((u) => u.id === id) ?? null;

export const isActiveUnit = (u: MockUnit) => u.status !== "shipped" && u.status !== "destroyed";

export function slicePage<T>(rows: T[], page: number, limit: number): T[] {
  return rows.slice((page - 1) * limit, page * limit);
}

export function matches(q: string | undefined, ...fields: Array<string | null | undefined>): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

export function sortBy<T>(
  rows: T[],
  key: (r: T) => string | number | Date | null,
  order: "asc" | "desc" = "asc"
): T[] {
  const sign = order === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    const va = ka instanceof Date ? ka.getTime() : ka;
    const vb = kb instanceof Date ? kb.getTime() : kb;
    if (va === vb) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return va < vb ? -sign : sign;
  });
}
