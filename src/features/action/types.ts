import type { UnitType } from "@/generated/prisma/enums";

export type ActionUnit = {
  id: number;
  name: string;
  type: UnitType;
  status: "active" | "on-hold" | "quarantine" | "shipped" | "destroyed";
  canEdit: boolean;
  holdKind: "HOLD" | "QUARANTINE" | null;
  locationId: number | null;
  growthStage: string | null;
  experimentId: number | null;
  humidWeight: number | null;
  dryWeight: number | null;
  seedCount: number | null;
};

export type ActionBootstrap = {
  user: { id: number; name: string; permissions: "ADMIN" | "REGULAR" };
  unit: ActionUnit | null;
  experiments: Array<{ id: number; ecode: string; name: string }>;
  cultivars: Array<{ id: number; name: string }>;
  locations: Array<{ id: number; name: string; capacity: number | null; occupancy: number }>;
  organizations: Array<{ id: number; name: string }>;
  witnesses: Array<{ id: number; name: string }>;
};
