import { NextResponse } from "next/server";
import {
  CULTIVARS,
  EXPERIMENTS,
  isActiveUnit,
  LOCATIONS,
  MEMBERS,
  ORGANIZATIONS,
  unitById,
  UNITS,
} from "@/features/mock/data";

// MOCK: the picker data behind the "take action" dialog.
export async function GET(request: Request) {
  const unitId = Number(new URL(request.url).searchParams.get("unitId"));
  const u = unitId ? unitById(unitId) : null;
  return NextResponse.json({
    user: { id: 1, name: "admin", permissions: "ADMIN" },
    unit: u
      ? {
          id: u.id,
          name: u.name,
          type: u.type,
          status: u.status,
          canEdit: u.status !== "shipped" && u.status !== "destroyed",
          holdKind:
            u.status === "quarantine" ? "QUARANTINE" : u.status === "on-hold" ? "HOLD" : null,
          locationId: u.locationId,
          growthStage: u.stage,
          experimentId: u.experimentId,
          humidWeight: u.humidWeight,
          dryWeight: u.dryWeight,
          seedCount: u.type === "SEEDLOT" ? 250 : null,
        }
      : null,
    experiments: EXPERIMENTS.map((e) => ({ id: e.id, ecode: e.ecode, name: e.name })),
    cultivars: CULTIVARS.map((c) => ({ id: c.id, name: c.name })),
    locations: LOCATIONS.filter((l) => l.active).map((l) => ({
      id: l.id,
      name: l.name,
      capacity: l.capacity,
      occupancy: UNITS.filter((x) => x.locationId === l.id && isActiveUnit(x)).length,
    })),
    organizations: ORGANIZATIONS.map((o) => ({ id: o.id, name: o.name })),
    witnesses: MEMBERS.filter((m) => m.status === "active").map((m) => ({
      id: m.id,
      name: m.name,
    })),
  });
}
