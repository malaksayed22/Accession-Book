import { isWeightBased } from "./materials";

/**
 * The shipment form's lines before they are sent. Pure, so the rules are unit tested and the form
 * only has to translate a problem into a sentence (this file holds no display text).
 */
export type LineDraft = {
  key: number;
  description: string;
  materialType: string;
  unitCount: string;
  weightGrams: string;
  moisture: string;
  cultivarId: string;
  /** Set when the line comes from a unit in inventory; the unit then leaves with the shipment. */
  unitId: string;
  unitName: string;
  comment: string;
};

export type LineProblem =
  "description" | "countMissing" | "countNotWhole" | "weightMissing" | "negative" | "basisMissing";

export function emptyLine(key: number): LineDraft {
  return {
    key,
    description: "",
    materialType: "SEED",
    unitCount: "",
    weightGrams: "",
    moisture: "",
    cultivarId: "",
    unitId: "",
    unitName: "",
    comment: "",
  };
}

/** The first thing wrong with a line, or null. Counts are whole numbers; weights carry a wet or dry basis. */
export function lineProblem(line: LineDraft): LineProblem | null {
  if (!line.description.trim()) return "description";

  if (isWeightBased(line.materialType)) {
    if (line.weightGrams.trim() === "" || Number.isNaN(Number(line.weightGrams))) {
      return "weightMissing";
    }
    if (Number(line.weightGrams) < 0) return "negative";
    if (line.moisture !== "WET" && line.moisture !== "DRY") return "basisMissing";
    return null;
  }

  if (line.unitCount.trim() === "" || Number.isNaN(Number(line.unitCount))) return "countMissing";
  if (Number(line.unitCount) < 0) return "negative";
  if (!Number.isInteger(Number(line.unitCount))) return "countNotWhole";
  return null;
}

/** Problems by line key; an empty object means the lines can be sent. */
export function lineProblems(lines: LineDraft[]): Record<number, LineProblem> {
  const out: Record<number, LineProblem> = {};
  for (const line of lines) {
    const problem = lineProblem(line);
    if (problem) out[line.key] = problem;
  }
  return out;
}

/** What the API expects for one line: counts and weights are numbers only for the basis they use. */
export function linePayload(line: LineDraft) {
  const weighed = isWeightBased(line.materialType);
  return {
    description: line.description.trim(),
    materialType: line.materialType,
    unitCount: !weighed && line.unitCount.trim() !== "" ? Number(line.unitCount) : null,
    weightGrams: weighed && line.weightGrams.trim() !== "" ? Number(line.weightGrams) : null,
    moisture: weighed ? line.moisture : null,
    cultivarId: line.cultivarId ? Number(line.cultivarId) : null,
    unitId: line.unitId ? Number(line.unitId) : null,
    comment: line.comment.trim() || null,
  };
}

/** The same line as the totals line wants it. */
export function lineQuantity(line: LineDraft) {
  return {
    materialType: line.materialType,
    unitCount: line.unitCount.trim() === "" ? null : Number(line.unitCount),
    weightGrams: line.weightGrams.trim() === "" ? null : Number(line.weightGrams),
    moisture: line.moisture || null,
  };
}
