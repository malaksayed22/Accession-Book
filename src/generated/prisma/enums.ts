// MOCK: stand-in for the generated Prisma enums.
const make = <const T extends readonly string[]>(values: T) =>
  Object.fromEntries(values.map((v) => [v, v])) as { [K in T[number]]: K };

export const UnitType = make(["PLANT", "SEEDLOT", "FLOWER", "CULTURE"] as const);
export type UnitType = keyof typeof UnitType;
export const GrowthStage = make([
  "VEGETATIVE", "FLOWERING", "HARVESTED", "DRYING", "CURING", "STORAGE", "SEED", "CULTURE",
] as const);
export type GrowthStage = keyof typeof GrowthStage;
export const UnitStateKind = make([
  "CREATED", "RECEIVED", "MOVED", "STAGE_CHANGED", "MEASURED", "SHIPPED", "DESTROYED",
] as const);
export type UnitStateKind = keyof typeof UnitStateKind;
export const HoldKind = make(["HOLD", "QUARANTINE"] as const);
export type HoldKind = keyof typeof HoldKind;
export const HoldOrigin = make(["MANUAL", "AUTO_TEST", "AUTO_INCIDENT"] as const);
export type HoldOrigin = keyof typeof HoldOrigin;
export const ShipmentDirection = make(["INBOUND", "OUTBOUND"] as const);
export type ShipmentDirection = keyof typeof ShipmentDirection;
export const ShipmentStatus = make(["DRAFT", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const);
export type ShipmentStatus = keyof typeof ShipmentStatus;
export const TestPanel = make([
  "POTENCY", "TERPENES", "PESTICIDES", "HEAVY_METALS", "MICROBIALS", "MYCOTOXINS", "MOISTURE", "FOREIGN", "OTHER",
] as const);
export type TestPanel = keyof typeof TestPanel;
export const TestVerdict = make(["PASS", "FAIL", "INCONCLUSIVE", "RECORDED"] as const);
export type TestVerdict = keyof typeof TestVerdict;
export const IncidentSeverity = make(["CRITICAL", "MAJOR", "MINOR"] as const);
export type IncidentSeverity = keyof typeof IncidentSeverity;
export const IncidentStatus = make(["OPEN", "INVESTIGATING", "CLOSED"] as const);
export type IncidentStatus = keyof typeof IncidentStatus;
export const ActivityType = make([
  "NUTRIENT", "FERTIGATION", "FOLIAR", "PESTICIDE", "BENEFICIAL_INSECTS", "SCOUTING", "PRUNING",
  "FLUSH", "GROW_MEDIA", "METRICS", "POTENCY", "TREATMENT", "ENVIRONMENT",
] as const);
export type ActivityType = keyof typeof ActivityType;
export const AttachmentCategory = make(["PHOTO", "PROTOCOL", "QC", "COA", "MANIFEST"] as const);
export type AttachmentCategory = keyof typeof AttachmentCategory;
export const SourceType = make([
  "SEED", "CUTTING", "CLONE", "SUBCULTURE", "RECEIVED", "INTERNAL", "HARVEST", "OTHER",
] as const);
export type SourceType = keyof typeof SourceType;
