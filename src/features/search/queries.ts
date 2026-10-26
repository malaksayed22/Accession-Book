import type { SessionUser } from "@/lib/auth";
import {
  cultivarById,
  CULTIVARS,
  experimentById,
  EXPERIMENTS,
  locationById,
  matches,
  MEMBERS,
  ORGANIZATIONS,
  UNITS,
} from "@/features/mock/data";

export const SEARCH_MIN_LENGTH = 2;
const GROUP_SIZE = 5;

/** Trims and collapses whitespace; null when the text is too short to search for. */
export function normalizeSearchText(raw: string | undefined | null): string | null {
  const text = raw?.trim().replace(/\s+/g, " ") ?? "";
  return text.length >= SEARCH_MIN_LENGTH ? text : null;
}

export type SearchGroup<T> = { hits: T[]; total: number };
const group = <T>(all: T[]): SearchGroup<T> => ({
  hits: all.slice(0, GROUP_SIZE),
  total: all.length,
});

export async function searchAll(user: SessionUser, query: string) {
  const admin = user.permissions === "ADMIN";
  return {
    query,
    units: group(
      UNITS.filter((u) => matches(query, u.name, cultivarById(u.cultivarId)?.name)).map((u) => ({
        id: u.id,
        name: u.name,
        type: u.type,
        status: u.status,
        cultivarId: u.cultivarId,
        cultivarName: cultivarById(u.cultivarId)?.name ?? null,
        experimentId: u.experimentId,
        experimentCode: experimentById(u.experimentId)?.ecode ?? null,
        locationId: u.locationId,
        locationName: locationById(u.locationId)?.name ?? null,
      }))
    ),
    experiments: group(
      EXPERIMENTS.filter((e) => matches(query, e.ecode, e.name)).map((e) => ({
        id: e.id,
        ecode: e.ecode,
        name: e.name,
      }))
    ),
    cultivars: group(
      CULTIVARS.filter((c) => matches(query, c.name, c.code, c.commonName)).map((c) => ({
        id: c.id,
        name: c.name,
        code: c.code,
        commonName: c.commonName,
      }))
    ),
    organizations: group(
      ORGANIZATIONS.filter((o) => matches(query, o.name, o.licence)).map((o) => ({
        id: o.id,
        name: o.name,
        country: o.country as string | null,
        licenceNumber: o.licence as string | null,
      }))
    ),
    members: admin
      ? group(
          MEMBERS.filter((m) => matches(query, m.name, m.email)).map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            permissions: m.permissions,
            active: m.status !== "deactivated",
          }))
        )
      : null,
  };
}
