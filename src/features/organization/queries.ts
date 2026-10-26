import type { SessionUser } from "@/lib/auth";
import { sumMaterials, type MaterialTotals } from "@/lib/materials";
import type { OrganizationRelation } from "@/lib/organization-profile";
import { getShipmentDetail } from "@/features/shipment/queries";
import {
  cultivarById,
  daysAgo,
  experimentById,
  matches,
  memberById,
  ORGANIZATIONS,
  organizationById,
  SHIPMENTS,
  slicePage,
  sortBy,
  TESTS,
  unitById,
  UNITS,
  AUDIT_ACTIONS,
} from "@/features/mock/data";

export const ORGANIZATION_LIST_SORTS = ["name", "country", "units", "shipments"] as const;
export const ORGANIZATION_RELATIONS = ["supplier", "recipient", "lab"] as const;
export const ORGANIZATION_SECTION_SIZE = 5;

const REL: Record<string, OrganizationRelation> = { SUPPLIER: "supplier", CUSTOMER: "recipient", LAB: "lab" };

export type OrganizationListRow = {
  id: number;
  name: string;
  country: string | null;
  licenceNumber: string | null;
  relations: OrganizationRelation[];
  suppliedUnits: number;
  inboundShipments: number;
  outboundShipments: number;
  labResults: number;
};

const toRow = (o: (typeof ORGANIZATIONS)[number]): OrganizationListRow => ({
  id: o.id,
  name: o.name,
  country: o.country,
  licenceNumber: o.licence,
  relations: [REL[o.relation]!],
  suppliedUnits: o.id === 1 ? UNITS.filter((u) => u.type === "SEEDLOT").length : 0,
  inboundShipments: SHIPMENTS.filter((s) => s.organizationId === o.id && s.direction === "INBOUND").length,
  outboundShipments: SHIPMENTS.filter((s) => s.organizationId === o.id && s.direction === "OUTBOUND").length,
  labResults: o.id === 2 ? TESTS.length : 0,
});

export async function listOrganizationCountries() {
  return [...new Set(ORGANIZATIONS.map((o) => o.country))].sort();
}

export async function listOrganizations(
  _user: SessionUser,
  f: {
    q?: string;
    relation?: OrganizationRelation;
    country?: string;
    sort: (typeof ORGANIZATION_LIST_SORTS)[number];
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  let rows = ORGANIZATIONS.map(toRow).filter(
    (o) =>
      matches(f.q, o.name, o.licenceNumber) &&
      (!f.relation || o.relations.includes(f.relation)) &&
      (!f.country || o.country === f.country)
  );
  const key = {
    name: (o: OrganizationListRow) => o.name.toLowerCase(),
    country: (o: OrganizationListRow) => o.country,
    units: (o: OrganizationListRow) => o.suppliedUnits,
    shipments: (o: OrganizationListRow) => o.inboundShipments + o.outboundShipments,
  }[f.sort];
  rows = sortBy(rows, key, f.order);
  return { rows: slicePage(rows, f.page, f.limit), total: rows.length };
}

export type OrganizationShipmentRow = {
  id: number;
  reference: string;
  status: "DRAFT" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  date: Date;
  lines: number;
  recordedBy: string;
  recordedById: number;
};
export type OrganizationUnitRow = {
  id: number;
  name: string;
  type: "PLANT" | "SEEDLOT" | "FLOWER" | "CULTURE";
  cultivar: { id: number; name: string } | null;
  experiment: { id: number; ecode: string } | null;
};
export type OrganizationTestRow = {
  id: number;
  unit: { id: number; name: string };
  panel: string;
  analyte: string;
  value: number | null;
  uom: string | null;
  verdict: "PASS" | "FAIL" | "INCONCLUSIVE" | "RECORDED";
  relation: "performed" | "supplied";
  testedAt: Date;
};
export type OrganizationAuditRow = { id: number; summary: string; userId: number; userName: string; createdAt: Date };

export async function getOrganizationDetail(
  user: SessionUser,
  id: number,
  pages: { inbound: number; outbound: number; units: number; tests: number }
) {
  const o = organizationById(id);
  if (!o) return null;
  const row = toRow(o);
  const size = ORGANIZATION_SECTION_SIZE;

  const shipmentRows = (direction: "INBOUND" | "OUTBOUND") =>
    SHIPMENTS.filter((s) => s.organizationId === id && s.direction === direction).map(
      (s): OrganizationShipmentRow => ({
        id: s.id,
        reference: s.reference,
        status: s.status,
        date: daysAgo(s.daysAgo),
        lines: s.units.length,
        recordedBy: memberById(1).name,
        recordedById: 1,
      })
    );
  const totalsFor = async (direction: "INBOUND" | "OUTBOUND"): Promise<MaterialTotals> => {
    const items: Array<Parameters<typeof sumMaterials>[0][number]> = [];
    for (const s of SHIPMENTS.filter((x) => x.organizationId === id && x.direction === direction)) {
      const d = await getShipmentDetail(user, s.id);
      for (const i of d?.items ?? []) {
        items.push({ materialType: i.materialType, unitCount: i.unitCount, weightGrams: i.weightGrams, moisture: i.moisture } as never);
      }
    }
    return sumMaterials(items);
  };
  const inbound = shipmentRows("INBOUND");
  const outbound = shipmentRows("OUTBOUND");
  const units: OrganizationUnitRow[] = (id === 1 ? UNITS.filter((u) => u.type === "SEEDLOT") : []).map((u) => {
    const c = cultivarById(u.cultivarId);
    const e = experimentById(u.experimentId);
    return {
      id: u.id,
      name: u.name,
      type: u.type,
      cultivar: c ? { id: c.id, name: c.name } : null,
      experiment: e ? { id: e.id, ecode: e.ecode } : null,
    };
  });
  const tests: OrganizationTestRow[] = (id === 2 ? TESTS : []).map((t) => ({
    id: t.id,
    unit: { id: t.unitId, name: unitById(t.unitId)!.name },
    panel: t.panel,
    analyte: t.analyte,
    value: t.value,
    uom: t.uom,
    verdict: t.verdict,
    relation: "performed",
    testedAt: daysAgo(t.daysAgo),
  }));
  const activity: OrganizationAuditRow[] = AUDIT_ACTIONS.filter(
    (a) => a.entityType === "organization" && a.entityId === id
  ).map((a, index) => ({ id: index + 1, summary: a.summary, userId: a.actor, userName: memberById(a.actor).name, createdAt: daysAgo(a.daysAgo) }));

  return {
    organization: {
      id: o.id,
      name: o.name,
      address: o.address as string | null,
      country: o.country as string | null,
      licenceNumber: o.licence as string | null,
      comment: o.comment,
    },
    relations: row.relations,
    counts: {
      suppliedUnits: row.suppliedUnits,
      unitsReceived: row.suppliedUnits,
      unitsShipped: outbound.length,
      shipments: inbound.length + outbound.length,
    },
    inboundTotals: await totalsFor("INBOUND"),
    outboundTotals: await totalsFor("OUTBOUND"),
    inbound: { rows: slicePage(inbound, pages.inbound, size), total: inbound.length },
    outbound: { rows: slicePage(outbound, pages.outbound, size), total: outbound.length },
    units: { rows: slicePage(units, pages.units, size), total: units.length },
    tests: { rows: slicePage(tests, pages.tests, size), total: tests.length },
    activity,
  };
}
