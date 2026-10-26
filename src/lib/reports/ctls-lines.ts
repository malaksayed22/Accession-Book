import type { CtlsLine } from "./types";

/**
 * Pure arithmetic of the CTLS monthly reconciliation, kept free of database code so the
 * invariant (closing = opening + additions - reductions) can be tested directly.
 */

/** Active inventory at an instant, grouped by unit type and growth stage. */
export type TotalsRow = {
  unitType: string;
  growthStage: string | null;
  units: number;
  humidWeight: number;
  dryWeight: number;
  seedCount: number;
};

/** Inventory events in a period, grouped by unit type and event kind. */
export type FlowRow = {
  unitType: string;
  kind: string;
  units: number;
  humidWeight: number;
  dryWeight: number;
  seedCount: number;
};

export const ADDITION_KINDS: ReadonlySet<string> = new Set(["CREATED", "RECEIVED"]);
export const REDUCTION_KINDS: ReadonlySet<string> = new Set(["SHIPPED", "DESTROYED"]);

export type Balance = {
  plantsVegetative: number;
  plantsFlowering: number;
  plantsOtherStage: number;
  plants: number;
  cultures: number;
  seedLots: number;
  seeds: number;
  flowerWet: number;
  flowerDry: number;
};

export type Movement = Balance;

/** Three decimals (grams); `+ 0` turns -0 into 0. */
const round3 = (value: number) => Math.round(value * 1000) / 1000 + 0;

const emptyBalance = (): Balance => ({
  plantsVegetative: 0,
  plantsFlowering: 0,
  plantsOtherStage: 0,
  plants: 0,
  cultures: 0,
  seedLots: 0,
  seeds: 0,
  flowerWet: 0,
  flowerDry: 0,
});

function accumulate(target: Balance, row: TotalsRow | FlowRow) {
  switch (row.unitType) {
    case "PLANT": {
      target.plants += row.units;
      if (!("kind" in row)) {
        if (row.growthStage === "VEGETATIVE") target.plantsVegetative += row.units;
        else if (row.growthStage === "FLOWERING") target.plantsFlowering += row.units;
        else target.plantsOtherStage += row.units;
      }
      break;
    }
    case "CULTURE":
      target.cultures += row.units;
      break;
    case "SEEDLOT":
      target.seedLots += row.units;
      target.seeds += row.seedCount;
      break;
    case "FLOWER":
      // Harvested material is accounted for by weight on flower units only.
      target.flowerWet += row.humidWeight;
      target.flowerDry += row.dryWeight;
      break;
  }
}

/** Active inventory by material class. */
export function summariseBalance(rows: TotalsRow[]): Balance {
  const balance = emptyBalance();
  for (const row of rows) accumulate(balance, row);
  balance.flowerWet = round3(balance.flowerWet);
  balance.flowerDry = round3(balance.flowerDry);
  return balance;
}

/** Quantities that entered (CREATED, RECEIVED) or left (SHIPPED, DESTROYED) in a period. */
export function summariseFlows(rows: FlowRow[], kinds: ReadonlySet<string>): Movement {
  const movement = emptyBalance();
  for (const row of rows) {
    if (kinds.has(row.kind)) accumulate(movement, row);
  }
  movement.flowerWet = round3(movement.flowerWet);
  movement.flowerDry = round3(movement.flowerDry);
  return movement;
}

/** closing = opening + additions - reductions + adjustments (adjustments are 0 on count lines). */
export function isReconciled(line: CtlsLine): boolean {
  const expected =
    (line.opening ?? 0) + (line.additions ?? 0) - (line.reductions ?? 0) + (line.adjustments ?? 0);
  return Math.abs(expected - (line.closing ?? 0)) < 0.0005;
}

function header(lineId: string, label: string, unit: string): CtlsLine {
  return {
    lineId,
    label,
    indent: 0,
    unit,
    opening: null,
    additions: null,
    reductions: null,
    closing: null,
  };
}

/** A distribution row: shows how the closing balance splits, with no flows of its own. */
function distribution(
  lineId: string,
  label: string,
  unit: string,
  opening: number,
  closing: number
): CtlsLine {
  return { lineId, label, indent: 1, unit, opening, additions: null, reductions: null, closing };
}

/** A count line: closing is the measured month-end snapshot and must equal the flow arithmetic. */
function countLine(
  lineId: string,
  label: string,
  unit: string,
  opening: number,
  additions: number,
  reductions: number,
  closing: number,
  isTotal = true
): CtlsLine {
  const line: CtlsLine = {
    lineId,
    label,
    indent: 0,
    unit,
    opening,
    additions,
    reductions,
    closing,
    isTotal,
  };
  line.reconciles = isReconciled(line);
  return line;
}

/**
 * A quantity line (seeds, grams): re-measurement can change the amount without any unit arriving
 * or leaving, so the difference is reported explicitly as `adjustments` rather than hidden.
 */
function quantityLine(
  lineId: string,
  label: string,
  indent: number,
  unit: string,
  opening: number,
  additions: number,
  reductions: number,
  closing: number
): CtlsLine {
  const adjustments = round3(closing - opening - additions + reductions);
  const line: CtlsLine = {
    lineId,
    label,
    indent,
    unit,
    opening,
    additions,
    reductions,
    closing,
    adjustments,
  };
  line.reconciles = isReconciled(line);
  return line;
}

export type CtlsComputation = {
  lines: CtlsLine[];
  /** Every count line satisfies closing = opening + additions - reductions exactly. */
  reconciles: boolean;
};

export function buildCtlsLines(
  opening: TotalsRow[],
  closing: TotalsRow[],
  flows: FlowRow[]
): CtlsComputation {
  const o = summariseBalance(opening);
  const c = summariseBalance(closing);
  const a = summariseFlows(flows, ADDITION_KINDS);
  const r = summariseFlows(flows, REDUCTION_KINDS);

  const lines: CtlsLine[] = [
    header("plants-header", "Living plants", "units"),
    distribution("plants-veg", "Vegetative", "plants", o.plantsVegetative, c.plantsVegetative),
    distribution("plants-flower", "Flowering", "plants", o.plantsFlowering, c.plantsFlowering),
    distribution(
      "plants-other",
      "Other stages (harvested, drying, curing, storage)",
      "plants",
      o.plantsOtherStage,
      c.plantsOtherStage
    ),
    countLine(
      "plants-total",
      "Total living plants",
      "plants",
      o.plants,
      a.plants,
      r.plants,
      c.plants
    ),
    header("cultures-header", "Tissue cultures", "units"),
    countLine(
      "cultures-total",
      "Active cultures",
      "units",
      o.cultures,
      a.cultures,
      r.cultures,
      c.cultures
    ),
    header("seeds-header", "Seed inventory", "seeds"),
    countLine(
      "seedlots-total",
      "Active seed lots",
      "lots",
      o.seedLots,
      a.seedLots,
      r.seedLots,
      c.seedLots
    ),
    quantityLine("seeds-total", "Total seed count", 0, "seeds", o.seeds, a.seeds, r.seeds, c.seeds),
    header("material-header", "Harvested research material", "grams"),
    quantityLine(
      "material-wet",
      "Wet / humid weight",
      1,
      "g",
      o.flowerWet,
      a.flowerWet,
      r.flowerWet,
      c.flowerWet
    ),
    quantityLine(
      "material-dry",
      "Dried weight",
      1,
      "g",
      o.flowerDry,
      a.flowerDry,
      r.flowerDry,
      c.flowerDry
    ),
  ];

  const reconciles = lines
    .filter((l) => l.reconciles !== undefined && l.adjustments === undefined)
    .every((l) => l.reconciles);
  return { lines, reconciles };
}
