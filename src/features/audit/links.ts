const ACTIONS = [
  "create",
  "update",
  "void",
  "derive",
  "derive_parent",
  "lineage",
  "stage_transition",
  "transfer",
  "measure",
  "activity",
  "attachment",
  "destroy",
  "hold",
  "release",
  "lab_test",
  "incident_open",
  "incident_update",
  "ship",
  "invite",
  "invite-revoke",
  "invite-reissue",
  "invite-accept",
  "deactivate",
  "reactivate",
  "profile-update",
  "login",
  "logout",
  "reauth",
  "password-change",
  "password-confirm-failed",
  "mfa-setup-started",
  "mfa-enabled",
  "mfa-disabled",
  "mfa-reset",
  "mfa-recovery-regenerated",
  "session-revoked",
] as const;
const ENTITY_TYPES = [
  "unit",
  "experiment",
  "member",
  "organization",
  "shipment",
  "incident",
  "auth",
] as const;

export type AuditAction = (typeof ACTIONS)[number];
export type AuditEntityType = (typeof ENTITY_TYPES)[number];

export const isKnownAction = (value: string): value is AuditAction =>
  (ACTIONS as readonly string[]).includes(value);
export const isKnownEntityType = (value: string): value is AuditEntityType =>
  (ENTITY_TYPES as readonly string[]).includes(value);

/** Where an audited record lives in the app, or null when it has no page. */
export function auditEntityHref(entityType: string, entityId: number | null): string | null {
  if (entityId === null) return null;
  switch (entityType) {
    case "unit":
      return `/inventory/units/${entityId}`;
    case "experiment":
      return `/inventory/experiments/${entityId}`;
    case "member":
      return `/records/members/${entityId}`;
    case "organization":
      return `/records/organizations/${entityId}`;
    case "shipment":
      return `/inventory/materials/${entityId}`;
    case "cultivar":
      return `/records/cultivars/${entityId}`;
    case "location":
      return `/inventory/units?location=${entityId}`;
    case "incident":
      return "/quality?view=incidents";
    default:
      return null;
  }
}

export const AUDIT_ACTION_LIST: readonly string[] = ACTIONS;
export const AUDIT_ENTITY_TYPE_LIST: readonly string[] = ENTITY_TYPES;
