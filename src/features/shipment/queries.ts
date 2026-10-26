import type { SessionUser } from "@/lib/auth";
import { sumMaterials, type MaterialTotals } from "@/lib/materials";
import {
  CULTIVARS,
  cultivarById,
  daysAgo,
  matches,
  memberById,
  organizationById,
  ORGANIZATIONS,
  SHIPMENTS,
  slicePage,
  sortBy,
  unitById,
  type MockShipment,
} from "@/features/mock/data";

export const SHIPMENT_LIST_SORTS = [
  "reference",
  "direction",
  "organization",
  "date",
  "status",
] as const;
export const SHIPMENT_LIST_DIRECTIONS = ["INBOUND", "OUTBOUND"] as const;
export const SHIPMENT_LIST_STATUSES = ["DRAFT", "IN_TRANSIT", "DELIVERED", "CANCELLED"] as const;

type Direction = MockShipment["direction"];
type Status = MockShipment["status"];

export type ShipmentListRow = {
  id: number;
  reference: string;
  direction: Direction;
  status: Status;
  organization: { id: number; name: string };
  movementDate: Date;
  totals: MaterialTotals;
  lineCount: number;
  trackingNumber: string | null;
  manifestNumber: string | null;
};

const MATERIAL_BY_TYPE = {
  PLANT: "PLANT",
  SEEDLOT: "SEED",
  FLOWER: "FLOWER",
  CULTURE: "CULTURE",
} as const;

function itemsFor(s: MockShipment) {
  return s.units.map((uid) => {
    const u = unitById(uid)!;
    const materialType = MATERIAL_BY_TYPE[u.type];
    return {
      id: s.id * 100 + uid,
      description: `${u.name}${u.dryWeight ? ` (dry)` : ""}`,
      comment: null as string | null,
      materialType: materialType as string,
      cultivar: cultivarById(u.cultivarId)
        ? { id: u.cultivarId!, name: cultivarById(u.cultivarId)!.name }
        : null,
      unit: { id: u.id, name: u.name },
      unitStanding: u.status,
      unitCount: u.type === "SEEDLOT" ? 250 : u.type === "FLOWER" ? null : 1,
      weightGrams: u.type === "FLOWER" ? (u.dryWeight ?? u.humidWeight) : (null as number | null),
      moisture: u.type === "FLOWER" ? ("DRY" as "WET" | "DRY") : (null as "WET" | "DRY" | null),
    };
  });
}
export type ShipmentDetailItem = ReturnType<typeof itemsFor>[number];

const totalsFor = (s: MockShipment) =>
  sumMaterials(
    itemsFor(s).map((i) => ({
      materialType: i.materialType,
      unitCount: i.unitCount,
      weightGrams: i.weightGrams,
      moisture: i.moisture,
    })) as Parameters<typeof sumMaterials>[0]
  );

const toRow = (s: MockShipment): ShipmentListRow => ({
  id: s.id,
  reference: s.reference,
  direction: s.direction,
  status: s.status,
  organization: { id: s.organizationId, name: organizationById(s.organizationId)!.name },
  movementDate: daysAgo(s.daysAgo),
  totals: totalsFor(s),
  lineCount: s.units.length,
  trackingNumber: s.tracking,
  manifestNumber: s.manifest,
});

type Filters = {
  q?: string;
  direction?: Direction;
  status?: Status;
  organizationId?: number;
  from?: string;
  to?: string;
};

const filterRows = (f: Filters) =>
  SHIPMENTS.map(toRow).filter(
    (s) =>
      matches(f.q, s.reference, s.organization.name, s.trackingNumber, s.manifestNumber) &&
      (!f.direction || s.direction === f.direction) &&
      (!f.status || s.status === f.status) &&
      (!f.organizationId || s.organization.id === f.organizationId) &&
      (!f.from || s.movementDate >= new Date(`${f.from}T00:00:00`)) &&
      (!f.to || s.movementDate <= new Date(`${f.to}T23:59:59`))
  );

export async function listShipments(
  _user: SessionUser,
  f: Filters & {
    sort: (typeof SHIPMENT_LIST_SORTS)[number];
    order: "asc" | "desc";
    page: number;
    limit: number;
  }
) {
  let rows = filterRows(f);
  const key = {
    reference: (s: ShipmentListRow) => s.reference,
    direction: (s: ShipmentListRow) => s.direction,
    organization: (s: ShipmentListRow) => s.organization.name.toLowerCase(),
    date: (s: ShipmentListRow) => s.movementDate,
    status: (s: ShipmentListRow) => s.status,
  }[f.sort];
  rows = sortBy(rows, key, f.order);
  return { rows: slicePage(rows, f.page, f.limit), total: rows.length };
}

export async function getShipmentStats(_user: SessionUser, f: Filters) {
  const rows = filterRows(f);
  const sum = (list: ShipmentListRow[]) => {
    const t = { seeds: 0, clones: 0, plants: 0, cultures: 0, wetGrams: 0, dryGrams: 0 };
    for (const r of list)
      for (const k of Object.keys(t) as Array<keyof typeof t>) t[k] += r.totals[k];
    return t;
  };
  const received = rows.filter((r) => r.direction === "INBOUND" && r.status === "DELIVERED");
  const shipped = rows.filter(
    (r) => r.direction === "OUTBOUND" && (r.status === "DELIVERED" || r.status === "IN_TRANSIT")
  );
  return {
    received: { count: received.length, totals: sum(received) },
    shipped: { count: shipped.length, totals: sum(shipped) },
    inTransit: rows.filter((r) => r.status === "IN_TRANSIT").length,
    drafts: rows.filter((r) => r.status === "DRAFT").length,
  };
}

export async function getShipmentFormOptions() {
  return {
    organizations: ORGANIZATIONS.map((o) => ({
      id: o.id,
      name: o.name,
      licenceNumber: o.licence as string | null,
    })),
    cultivars: CULTIVARS.map((c) => ({ id: c.id, name: c.name })),
  };
}

export type ShipmentTimelineEntry = {
  id: number;
  action: "create" | "update";
  fields: string[];
  statusFrom: Status | null;
  statusTo: Status | null;
  actor: string;
  actorId: number;
  at: Date;
};

export async function getShipmentDetail(_user: SessionUser, id: number) {
  const s = SHIPMENTS.find((x) => x.id === id);
  if (!s) return null;
  const org = organizationById(s.organizationId)!;
  const timeline: ShipmentTimelineEntry[] = [
    {
      id: 1,
      action: "create",
      fields: [],
      statusFrom: null,
      statusTo: "DRAFT",
      actor: memberById(1).name,
      actorId: 1,
      at: daysAgo(s.daysAgo + 1),
    },
  ];
  if (s.status !== "DRAFT") {
    timeline.unshift({
      id: 2,
      action: "update",
      fields: ["shippedDate", "trackingNumber"],
      statusFrom: "DRAFT",
      statusTo: s.status,
      actor: memberById(1).name,
      actorId: 1,
      at: daysAgo(s.daysAgo),
    });
  }
  const items = itemsFor(s);
  return {
    id: s.id,
    reference: s.reference,
    direction: s.direction,
    status: s.status,
    organization: { id: org.id, name: org.name },
    recordedBy: memberById(1).name,
    recordedById: 1,
    shippedDate: s.status === "DRAFT" ? null : daysAgo(s.daysAgo),
    deliveredDate: s.status === "DELIVERED" ? daysAgo(Math.max(0, s.daysAgo - 2)) : null,
    trackingNumber: s.tracking,
    manifestNumber: s.manifest,
    licenceNumber: org.licence as string | null,
    address: org.address as string | null,
    createdAt: daysAgo(s.daysAgo + 1),
    comment:
      s.id === 3 ? "Export permit EP-2291 attached to the manifest." : (null as string | null),
    items,
    totals: totalsFor(s),
    unitLineCount: items.length,
    timeline,
  };
}
