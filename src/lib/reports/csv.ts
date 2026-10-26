import type { ReportResult } from "./types";

/** A spreadsheet treats a cell starting with one of these as a formula (CSV injection). */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
/** A plain negative number is data, not a formula: -5, -0.25. */
const NEGATIVE_NUMBER = /^-\d+(\.\d+)?$/;

/**
 * One CSV cell: formula-neutralised, then quoted per RFC 4180 when it contains a comma, a quote
 * or a line break. Numbers are written as they are (a negative number must stay a number); text
 * that could be read as a formula gets a leading single quote, as OWASP recommends.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value == null) return "";
  let text = String(value);
  if (typeof value === "string" && FORMULA_TRIGGER.test(text) && !NEGATIVE_NUMBER.test(text)) {
    text = `'${text}`;
  }
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function reportToCsv(result: ReportResult): string {
  const lines: string[] = [];
  const row = (cells: Array<string | number | null | undefined>) =>
    cells.map(escapeCsvCell).join(",");

  lines.push(escapeCsvCell(result.meta.title));
  if (result.meta.periodLabel) lines.push(row(["Period", result.meta.periodLabel]));
  if (result.meta.licenseId) lines.push(row(["Licence ID", result.meta.licenseId]));
  lines.push(row(["Generated", result.meta.generatedAt]));
  lines.push("");

  if (result.ctls) {
    lines.push("Category,Opening,Additions,Reductions,Closing,Unit,Adjustments");
    for (const entry of result.ctls.lines) {
      const prefix = "  ".repeat(entry.indent);
      lines.push(
        row([
          `${prefix}${entry.label}`,
          entry.opening,
          entry.additions,
          entry.reductions,
          entry.closing,
          entry.unit,
          entry.adjustments,
        ])
      );
    }
    lines.push("");
  }

  for (const section of result.sections) {
    lines.push(escapeCsvCell(section.title));
    lines.push(row(section.columns.map((c) => c.label)));
    for (const record of section.rows) {
      lines.push(row(section.columns.map((c) => record[c.key] ?? "")));
    }
    lines.push("");
  }

  return lines.join("\n");
}
