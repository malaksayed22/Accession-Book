import { ACTIVITY_TYPE_IDS, ATTACHMENT_CATEGORY_IDS, DERIVE_TYPES } from "@/lib/unit-action-constants";

/** A problem with one field. The UI turns `code` into a sentence (`actions.issues.<code>`). */
export type FieldIssue = {
  code:
    | "required"
    | "invalid"
    | "tooShort"
    | "rangeBetween"
    | "rangeMin"
    | "rangeMax"
    | "range"
    | "mismatch"
    | "future"
    | "unchanged"
    | "atLeastOne";
  min?: number;
  max?: number;
};
export type Issues<K extends string> = Partial<Record<K, FieldIssue>>;
type Built<K extends string> =
  | { ok: true; payload: Record<string, unknown> }
  | { ok: false; issues: Issues<K> };

export const MIN_REASON_LENGTH = 10;
export const STAGE_CHOICES = ["VEGETATIVE", "FLOWERING", "HARVESTED", "DRYING", "CURING", "STORAGE"] as const;
export const UNIT_TYPE_CHOICES = ["PLANT", "SEEDLOT", "FLOWER", "CULTURE"] as const;
export const REGISTER_SOURCE_TYPES = ["SEED", "CUTTING", "CLONE", "SUBCULTURE", "RECEIVED", "INTERNAL", "OTHER"] as const;
export const ACTIVITY_TYPE_CHOICES = ACTIVITY_TYPE_IDS;
export const ATTACHMENT_CATEGORY_CHOICES = ATTACHMENT_CATEGORY_IDS;

export const todayKey = () => new Date().toISOString().slice(0, 10);

const blank = (v: string | boolean | undefined) => v === undefined || v === false || String(v).trim() === "";

function check<K extends string>(values: Record<string, string | boolean>, required: readonly K[]): Issues<K> {
  const issues: Issues<K> = {};
  for (const key of required) if (blank(values[key])) issues[key] = { code: "required" };
  return issues;
}

function result<K extends string>(issues: Issues<K>, payload: Record<string, unknown>): Built<K> {
  return Object.keys(issues).length ? { ok: false, issues } : { ok: true, payload };
}

// --- Derive ---------------------------------------------------------------------------------------
export type DeriveKey = "deriveType" | "quantity" | "experimentId" | "name" | "growthStage" | "locationId" | "comment";
export const initialDeriveValues = (kinds: readonly string[], experimentId?: number | null) => ({
  deriveType: kinds[0] ?? DERIVE_TYPES[0],
  quantity: "1",
  experimentId: experimentId ? String(experimentId) : "",
  name: "",
  growthStage: "VEGETATIVE",
  locationId: "",
  comment: "",
});
export const buildDerivePayload = (v: ReturnType<typeof initialDeriveValues>): Built<DeriveKey> =>
  result(check(v, ["deriveType", "quantity", "name"]), v);

// --- Destroy --------------------------------------------------------------------------------------
export type DestroyKey = "witnessId" | "date" | "reason";
export const validateDestroyDetails = (v: { witnessId: string; date: string }, today: string): Issues<DestroyKey> => {
  const issues: Issues<DestroyKey> = {};
  if (!v.witnessId) issues.witnessId = { code: "required" };
  if (!v.date) issues.date = { code: "required" };
  else if (v.date > today) issues.date = { code: "future" };
  return issues;
};
export const buildDestroyPayload = (v: { witnessId: string; date: string }, reason: string, _today: string) => ({
  witnessId: Number(v.witnessId),
  date: v.date,
  reason,
});

// --- Holds ----------------------------------------------------------------------------------------
export type HoldKey = "kind" | "reason";
export const buildPlaceHoldPayload = (v: { kind: string; reason: string }): Built<HoldKey> => {
  const issues = check(v, ["kind"]) as Issues<HoldKey>;
  if (v.reason.trim().length < MIN_REASON_LENGTH) issues.reason = { code: "tooShort", min: MIN_REASON_LENGTH };
  return result(issues, v);
};
export const buildReleaseHoldPayload = (reason: string) => ({ release: true, reason });

// --- Measure --------------------------------------------------------------------------------------
export type MeasureKey = "humidWeight" | "dryWeight" | "seedCount" | "date" | "any";
export const buildMeasurePayload = (
  v: { humidWeight: string; dryWeight: string; seedCount: string; date: string; comment: string },
  _type: string,
  today: string
): Built<MeasureKey> => {
  const issues: Issues<MeasureKey> = {};
  if (blank(v.humidWeight) && blank(v.dryWeight) && blank(v.seedCount)) issues.any = { code: "atLeastOne" };
  if (v.date && v.date > today) issues.date = { code: "future" };
  return result(issues, v);
};

// --- Move -----------------------------------------------------------------------------------------
export type MoveKey = "toLocationId" | "barcode";
export const buildMovePayload = (
  v: { toLocationId: string; barcode: string; comment: string },
  unit: { locationId: number | null }
): Built<MoveKey> => {
  const issues = check(v, ["toLocationId"]) as Issues<MoveKey>;
  if (v.toLocationId && Number(v.toLocationId) === unit.locationId) issues.toLocationId = { code: "unchanged" };
  return result(issues, v);
};

// --- Stage ----------------------------------------------------------------------------------------
export type StageKey = "toStage" | "date";
export const buildStagePayload = (
  v: { toStage: string; date: string; comment: string },
  _unit: unknown,
  today: string
): Built<StageKey> => {
  const issues = check(v, ["toStage"]) as Issues<StageKey>;
  if (v.date && v.date > today) issues.date = { code: "future" };
  return result(issues, v);
};

// --- Activity / attachment -----------------------------------------------------------------------
export type ActivityKey = "type" | "title";
export const buildActivityPayload = (v: { type: string; title: string; details: string }): Built<ActivityKey> =>
  result(check(v, ["type", "title"]), v);
export type AttachKey = "category" | "file";
export const validateAttachment = (v: { category: string }, file: File | null, maxBytes: number): Issues<AttachKey> => {
  const issues = check(v, ["category"]) as Issues<AttachKey>;
  if (!file) issues.file = { code: "required" };
  else if (file.size > maxBytes) issues.file = { code: "rangeMax", max: maxBytes };
  return issues;
};

// --- Register -------------------------------------------------------------------------------------
export type RegisterKey =
  | "experimentId"
  | "type"
  | "cultivarId"
  | "name"
  | "quantity"
  | "growthStage"
  | "locationId"
  | "humidWeight"
  | "dryWeight"
  | "seedCount"
  | "sourceType"
  | "providerOrganizationId"
  | "sourceDescription"
  | "comment";
export const initialRegisterValues = (experimentId?: number) => ({
  experimentId: experimentId ? String(experimentId) : "",
  type: "PLANT",
  cultivarId: "",
  name: "",
  quantity: "1",
  growthStage: "VEGETATIVE",
  locationId: "",
  humidWeight: "",
  dryWeight: "",
  seedCount: "",
  sourceType: "INTERNAL",
  providerOrganizationId: "",
  sourceDescription: "",
  comment: "",
});
type RegisterValues = ReturnType<typeof initialRegisterValues>;
export const previewNames = (name: string, quantity: number): string[] => {
  const base = name.trim();
  if (!base) return [];
  if (quantity <= 1) return [base];
  return Array.from({ length: Math.min(quantity, 5) }, (_, i) => `${base}-${String(i + 1).padStart(3, "0")}`);
};
export const validateRegisterMaterial = (v: RegisterValues): Issues<RegisterKey> => {
  const issues = check(v, ["experimentId", "type", "cultivarId", "name", "quantity"] as const) as Issues<RegisterKey>;
  const q = Number(v.quantity);
  if (!issues.quantity && (!Number.isInteger(q) || q < 1 || q > 500)) {
    issues.quantity = { code: "rangeBetween", min: 1, max: 500 };
  }
  return issues;
};
export const buildRegisterPayload = (v: RegisterValues, mode: "register" | "receive"): Built<RegisterKey> => {
  const issues = validateRegisterMaterial(v);
  if (mode === "receive" && blank(v.providerOrganizationId)) issues.providerOrganizationId = { code: "required" };
  return result(issues, { ...v, mode });
};

// --- Ship -----------------------------------------------------------------------------------------
export type ShipKey = "organizationId" | "quantity" | "moisture";
export const shippingMaterial = (type: string): "FLOWER" | "PLANT" | "SEED" | "CULTURE" =>
  type === "FLOWER" ? "FLOWER" : type === "SEEDLOT" ? "SEED" : type === "CULTURE" ? "CULTURE" : "PLANT";
export const initialShipValues = (unit: {
  type: string;
  seedCount: number | null;
  humidWeight: number | null;
  dryWeight: number | null;
}) => ({
  organizationId: "",
  quantity:
    unit.type === "SEEDLOT" && unit.seedCount
      ? String(unit.seedCount)
      : unit.type === "FLOWER"
        ? String(unit.dryWeight ?? unit.humidWeight ?? "")
        : "1",
  moisture: "DRY",
  trackingNumber: "",
  manifestNumber: "",
  licenceNumber: "",
  address: "",
  comment: "",
  dispatchNow: true,
});
export const buildShipPayload = (
  v: ReturnType<typeof initialShipValues>,
  unit: { id: number; type: string }
): Built<ShipKey> => result(check(v, ["organizationId", "quantity"] as const), { ...v, unitId: unit.id });
