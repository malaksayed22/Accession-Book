import type { UnitProfile } from "@/features/unit/queries";

/** What the action forms need to know about the unit. Plain values only: it crosses to the client. */
export type ActionUnit = {
  id: number;
  name: string;
  type: UnitProfile["type"];
  locationId: number | null;
  growthStage: NonNullable<UnitProfile["current"]>["growthStage"];
  humidWeight: number | null;
  dryWeight: number | null;
  seedCount: number | null;
  sex: string | null;
  notes: string | null;
  terminal: UnitProfile["terminal"];
};

export type Option = { id: number; name: string };

export type DialogProps = { unit: ActionUnit; onClose: () => void };
