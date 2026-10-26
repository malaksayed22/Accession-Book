import type { Prisma } from "@/generated/prisma/client";
import { UnitStateKind } from "@/generated/prisma/enums";
import { prisma } from "@/server/db";

export { formatDate, formatDateTime } from "./format";

export function getExperimentStatus(endDate: Date | null): "active" | "completed" {
  if (!endDate) return "active";
  return endDate >= new Date() ? "active" : "completed";
}

export const UNIT_TYPE_COLORS: Record<string, string> = {
  PLANT: "#22c55e",
  FLOWER: "#3b82f6",
  CULTURE: "#f97316",
  SEEDLOT: "#a855f7",
};

export const UNIT_TYPE_LABELS: Record<string, string> = {
  PLANT: "Plants",
  FLOWER: "Flowers",
  CULTURE: "Cultures",
  SEEDLOT: "Seed Lots",
};

/** Units still in inventory: their newest event is not SHIPPED or DESTROYED. */
export const ACTIVE_UNIT_FILTER = {
  currentState: {
    is: { kind: { notIn: [UnitStateKind.SHIPPED, UnitStateKind.DESTROYED] } },
  },
} satisfies Prisma.BiologicalUnitWhereInput;

const activeUnitInclude = {
  cultivar: true,
  experiment: true,
  currentState: { include: { location: true } },
} satisfies Prisma.BiologicalUnitInclude;

export type ActiveUnit = Prisma.BiologicalUnitGetPayload<{ include: typeof activeUnitInclude }>;

/** Every active unit with its cultivar, experiment and current state (with location). */
export async function getActiveUnits(where: Prisma.BiologicalUnitWhereInput = {}) {
  return prisma.biologicalUnit.findMany({
    where: { AND: [ACTIVE_UNIT_FILTER, where] },
    include: activeUnitInclude,
    orderBy: { name: "asc" },
  });
}

/** Active-unit counts per location, in one aggregate query. */
export async function getLocationOccupancy(): Promise<Map<number, number>> {
  const rows = await prisma.$queryRaw<Array<{ locationId: number; units: bigint }>>`
    SELECT s."locationId" AS "locationId", count(*) AS "units"
    FROM "BiologicalUnit" u
    JOIN "UnitState" s ON s."id" = u."currentStateId"
    WHERE s."kind" NOT IN ('SHIPPED', 'DESTROYED') AND s."locationId" IS NOT NULL
    GROUP BY s."locationId"`;
  return new Map(rows.map((row) => [row.locationId, Number(row.units)]));
}
