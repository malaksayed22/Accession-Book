import { CircleCheck, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { StatCard } from "@/components/page/StatCard";
import { Banner } from "@/components/ui/Banner";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/lib/brand";
import {
  isCtlsLineId,
  isCtlsUnit,
  isKpiId,
  isSectionId,
  isSectionWithDescription,
  resolveColumnKey,
  translateCell,
} from "@/lib/reports/display";
import type { CtlsLine, ReportResult, ReportSection } from "@/lib/reports/types";
import { cn } from "@/lib/utils";

type Cell = string | number | null;
type Row = { index: number; cells: Record<string, Cell> };

const PRINT_TABLE = "print:max-h-none print:overflow-visible";

/*
 * Usage (server component): <ReportDisplay result={result} zone="America/Toronto" period="March 2026" />
 * Shows a generated report on screen in the reader's language. The report itself (and its CSV)
 * keeps the stable English regulatory wording; this translates titles, column headings, key
 * figures and the few vocabulary words in cells by stable id, falling back to the generator's own
 * text for anything it does not know. Dates in cells stay ISO, as in the export. Tables have a
 * sticky header and print in full.
 */
export function ReportDisplay({
  result,
  zone,
  period,
}: {
  result: ReportResult;
  zone: string;
  /** The period in the reader's language; omitted for point-in-time reports. */
  period?: string;
}) {
  const t = useTranslations("reports.display");
  const format = useFormatter();
  const { meta } = result;

  return (
    <div className="report-output space-y-6">
      <Panel>
        <PanelBody>
          <p className="text-sm font-medium text-fg-secondary">
            {t("brandReport", { brand: BRAND.name })}
          </p>
          <dl className="mt-2 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            {period ? (
              <div>
                <dt className="text-fg-secondary">{t("period")}</dt>
                <dd className="font-medium text-fg">{period}</dd>
              </div>
            ) : null}
            {meta.licenseId ? (
              <div>
                <dt className="text-fg-secondary">{t("licence")}</dt>
                <dd className="font-medium text-fg">{meta.licenseId}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-fg-secondary">{t("generated")}</dt>
              <dd className="font-medium text-fg">
                <time dateTime={meta.generatedAt}>
                  {format.dateTime(new Date(meta.generatedAt), "dateTime")}
                </time>
              </dd>
            </div>
          </dl>
        </PanelBody>
      </Panel>

      {result.kpis && result.kpis.length > 0 ? (
        <section aria-labelledby="report-kpis" className="space-y-3">
          <h2 id="report-kpis" className="text-base font-semibold text-fg">
            {t("keyFigures")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {result.kpis.map((kpi) => (
              <StatCard
                key={kpi.id ?? kpi.label}
                label={isKpiId(kpi.id) ? t(`kpis.${kpi.id}`) : kpi.label}
                value={kpiValue(kpi, t, format.number)}
                tone={
                  kpi.id === "reconciled" ? (kpi.value === "Yes" ? "success" : "danger") : "default"
                }
              />
            ))}
          </div>
        </section>
      ) : null}

      {result.ctls ? <CtlsPanel ctls={result.ctls} zone={zone} /> : null}

      {result.sections.map((section) => (
        <SectionPanel key={section.id ?? section.title} section={section} />
      ))}
    </div>
  );
}

function kpiValue(
  kpi: NonNullable<ReportResult["kpis"]>[number],
  t: ReturnType<typeof useTranslations<"reports.display">>,
  number: (value: number, options: { maximumFractionDigits: number }) => string
): ReactNode {
  if (kpi.id === "reconciled") return kpi.value === "Yes" ? t("tokens.yes") : t("tokens.no");
  return typeof kpi.value === "number"
    ? number(kpi.value, { maximumFractionDigits: 3 })
    : kpi.value;
}

function SectionPanel({ section }: { section: ReportSection }) {
  const t = useTranslations("reports.display");
  const domain = useTranslations("domain");
  const format = useFormatter();

  const title = isSectionId(section.id) ? t(`sections.${section.id}`) : section.title;
  const description = isSectionWithDescription(section.id)
    ? t(`sectionDescriptions.${section.id}`)
    : section.description;

  const rows: Row[] = section.rows.map((cells, index) => ({ index, cells }));
  const empty = domain("empty");

  const render = (column: ReportSection["columns"][number], row: Row): ReactNode => {
    const value = row.cells[column.key] ?? null;
    if (value === null || value === "") return empty;
    const translation = translateCell(section.id, column.key, value);
    if (translation) {
      switch (translation.ns) {
        case "unitType":
          return domain(`unitType.${translation.key}`);
        case "growthStage":
          return domain(`growthStage.${translation.key}`);
        case "sourceType":
          return domain(`sourceType.${translation.key}`);
        case "experimentStatus":
          return domain(`experimentStatus.${translation.key}`);
        case "token":
          return t(`tokens.${translation.key}`);
      }
    }
    if (typeof value === "number") return format.number(value, { maximumFractionDigits: 3 });
    // A row names where its records live: `_href` for the unit, `_href:<column>` for any other column.
    const href = column.key === "unit" ? row.cells._href : row.cells[`_href:${column.key}`];
    if (typeof href === "string") {
      return (
        <Link href={href} className="font-medium text-accent-text hover:underline">
          {value}
        </Link>
      );
    }
    return value;
  };

  const columns: Array<Column<Row>> = section.columns.map((column) => {
    const key = resolveColumnKey(section.id, column.key);
    return {
      id: column.key,
      header: key ? t(`columns.${key}`) : column.label,
      align: column.align === "right" ? "end" : undefined,
      className: column.align === "right" ? "tabular-nums" : undefined,
      cell: (row: Row) => render(column, row),
    };
  });

  return (
    <Panel>
      <PanelHeader title={title} description={description} />
      <PanelBody>
        <DataTable
          caption={title}
          captionHidden
          columns={columns}
          rows={rows}
          rowKey={(row) => row.index}
          stickyHeader
          density="compact"
          className={PRINT_TABLE}
          empty={<span className="text-fg-secondary">{t("noRecords")}</span>}
        />
      </PanelBody>
    </Panel>
  );
}

/** The unit type a CTLS line counts, so the line can open those units. */
function ctlsLineType(lineId: string): "PLANT" | "CULTURE" | "SEEDLOT" | null {
  if (lineId.startsWith("plants")) return "PLANT";
  if (lineId.startsWith("cultures")) return "CULTURE";
  if (lineId.startsWith("seedlots")) return "SEEDLOT";
  return null;
}

function CtlsPanel({ ctls, zone }: { ctls: NonNullable<ReportResult["ctls"]>; zone: string }) {
  const t = useTranslations("reports.display");
  const domain = useTranslations("domain");
  const format = useFormatter();
  const empty = domain("empty");
  const number = (value: number | null | undefined) =>
    value === null || value === undefined
      ? empty
      : format.number(value, { maximumFractionDigits: 3 });
  const signed = (value: number | null | undefined, sign: "+" | "−") =>
    value === null || value === undefined || value === 0
      ? number(value)
      : `${sign}${number(value)}`;

  const label = (line: CtlsLine) =>
    isCtlsLineId(line.lineId) ? t(`ctlsLines.${line.lineId}`) : line.label;

  const columns: Array<Column<CtlsLine>> = [
    {
      id: "category",
      header: t("ctls.category"),
      rowHeader: true,
      cell: (line) => {
        const type = ctlsLineType(line.lineId);
        const text = label(line);
        return (
          <span className={cn(line.indent > 0 && "ps-5", line.isTotal && "font-semibold")}>
            {type ? (
              <Link
                href={`/inventory/units?type=${type}`}
                className="text-accent-text hover:underline"
              >
                {text}
              </Link>
            ) : (
              text
            )}
          </span>
        );
      },
    },
    {
      id: "opening",
      header: t("ctls.opening"),
      align: "end",
      className: "tabular-nums",
      cell: (line) => number(line.opening),
    },
    {
      id: "additions",
      header: t("ctls.additions"),
      align: "end",
      className: "tabular-nums",
      cell: (line) => signed(line.additions, "+"),
    },
    {
      id: "reductions",
      header: t("ctls.reductions"),
      align: "end",
      className: "tabular-nums",
      cell: (line) => signed(line.reductions, "−"),
    },
    {
      id: "adjustments",
      header: t("ctls.adjustments"),
      align: "end",
      className: "tabular-nums",
      cell: (line) => (line.adjustments === undefined ? empty : number(line.adjustments)),
    },
    {
      id: "closing",
      header: t("ctls.closing"),
      align: "end",
      className: "tabular-nums font-semibold",
      cell: (line) => number(line.closing),
    },
    {
      id: "unit",
      header: t("ctls.unit"),
      cell: (line) => (isCtlsUnit(line.unit) ? t(`ctlsUnits.${line.unit}`) : line.unit),
    },
  ];

  const reconciles = ctls.reconciles !== false;
  const notes = [
    t("ctls.notes.zone", { zone }),
    t("ctls.notes.opening"),
    t("ctls.notes.additions"),
    t("ctls.notes.reductions"),
    t("ctls.notes.adjustments"),
    t("ctls.notes.distribution"),
  ];

  return (
    <Panel>
      <PanelHeader title={t("ctls.heading")} description={t("ctls.flow")} />
      <PanelBody className="space-y-4">
        <Banner tone={reconciles ? "success" : "danger"}>
          <span className="inline-flex items-center gap-1.5">
            {reconciles ? (
              <CircleCheck aria-hidden="true" className="size-4" />
            ) : (
              <TriangleAlert aria-hidden="true" className="size-4" />
            )}
            {reconciles ? t("ctls.notes.reconciled") : t("ctls.notes.notReconciled")}
          </span>
        </Banner>
        <DataTable
          caption={t("ctls.caption")}
          captionHidden
          columns={columns}
          rows={ctls.lines}
          rowKey={(line) => line.lineId}
          stickyHeader
          density="compact"
          className={PRINT_TABLE}
        />
        <div>
          <h3 className="text-sm font-semibold text-fg">{t("ctls.notesHeading")}</h3>
          <ul className="mt-1 list-disc space-y-1 ps-5 text-sm text-fg-secondary">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </PanelBody>
    </Panel>
  );
}
