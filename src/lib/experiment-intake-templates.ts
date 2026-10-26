/**
 * Saved intake patterns for the new-experiment form. Stored in localStorage per
 * user so scientists can reuse common batch setups without touching the DB.
 */

import { storageKey as storageKeyFor } from "./brand";

export type IntakeTemplateGroup = {
  kind: string;
  cultivarId: string;
  cultivarMode: "SAME" | "MIXED";
  cultivarBreakdown: Record<string, string>;
  quantity: string;
  statusMode: "SAME" | "MIXED";
  status: string;
  breakdown: Record<string, string>;
  seedsPerLot: string;
  wetWeightGrams: string;
  dryWeightGrams: string;
};

export type IntakeTemplateSnapshot = {
  providerMode: "INTERNAL" | "EXTERNAL";
  groups: IntakeTemplateGroup[];
};

export type IntakeTemplate = {
  id: string;
  name: string;
  savedAt: string;
  snapshot: IntakeTemplateSnapshot;
};

const STORAGE_KEY = storageKeyFor("experiment-intake-templates");
/** Pre-rebrand key. Read once so saved templates survive the rename. */
const LEGACY_STORAGE_KEY = "cannabase.experiment-intake-templates";

function userKey(userId: number) {
  return `${STORAGE_KEY}.${userId}`;
}

function legacyUserKey(userId: number) {
  return `${LEGACY_STORAGE_KEY}.${userId}`;
}

function parseTemplates(raw: string | null): IntakeTemplate[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as IntakeTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listIntakeTemplates(userId: number): IntakeTemplate[] {
  if (typeof window === "undefined") return [];
  try {
    const current = parseTemplates(localStorage.getItem(userKey(userId)));
    if (current.length) return current;

    const legacy = parseTemplates(localStorage.getItem(legacyUserKey(userId)));
    if (legacy.length) {
      localStorage.setItem(userKey(userId), JSON.stringify(legacy));
      localStorage.removeItem(legacyUserKey(userId));
    }
    return legacy;
  } catch {
    return [];
  }
}

export function saveIntakeTemplate(
  userId: number,
  name: string,
  snapshot: IntakeTemplateSnapshot
): IntakeTemplate {
  const templates = listIntakeTemplates(userId);
  const entry: IntakeTemplate = {
    id: `tpl_${Date.now()}`,
    name: name.trim(),
    savedAt: new Date().toISOString(),
    snapshot,
  };
  const next = [entry, ...templates.filter((t) => t.name !== entry.name)].slice(0, 20);
  localStorage.setItem(userKey(userId), JSON.stringify(next));
  return entry;
}

export function deleteIntakeTemplate(userId: number, templateId: string) {
  const next = listIntakeTemplates(userId).filter((t) => t.id !== templateId);
  localStorage.setItem(userKey(userId), JSON.stringify(next));
}
