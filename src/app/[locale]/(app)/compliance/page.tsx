export const dynamic = "force-dynamic";

import { CircleCheck, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { AuditChainResult } from "@/components/AuditChainResult";
import { StatCard } from "@/components/page/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import {
  getComplianceConsole,
  type CtlsMonthStatus,
  type ReconciliationLine,
} from "@/features/compliance/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { isAdmin, requirePageUser } from "@/lib/auth";
import {
  openFindingsByUrgency,
  STALE_DESTRUCTION_DAYS,
  STUCK_SHIPMENT_DAYS,
  type ComplianceFinding,
  type OffenderDetail,
  type Severity,
} from "@/lib/compliance";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("overview");
  return { title: t("pageTitle") };
}

const CTLS_LINE_TYPE = {
  "plants-total": "PLANT",
  "cultures-total": "CULTURE",
  "seedlots-total": "SEEDLOT",
} as const;

/** Where each month figure can be inspected: the list that holds those records. */
const MONTH_FIGURE_HREF = {
  activeAtClose: "/inventory/units?status=active",
  newUnits: "/inventory/units",
  destructions: "/inventory/destroyed",
  shipments: "/inventory/materials",
} as const;

const SEVERITY_TONE = { critical: "danger", warning: "warning", info: "info" } as const;
const SEVERITY_ICON = {
  critical: TriangleAlert,
  warning: TriangleAlert,
  info: CircleCheck,
} as const;

export default async function OverviewPage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const t = await getTranslations("overview");
  const domain = await getTranslations("domain");
  const format = await getFormatter();
  const admin = isAdmin(user);

  const console_ = await getComplianceConsole(user);
  const { checks, destruction, chain } = console_;
  const open = openFindingsByUrgency(checks);
  const first = open[0];
  const days = (id: ComplianceFinding["id"]) =>
    id === "destruction-filed-promptly" ? STALE_DESTRUCTION_DAYS : STUCK_SHIPMENT_DAYS;

  const monthName = (status: CtlsMonthStatus) =>
    format.dateTime(new Date(Date.UTC(status.year, status.month - 1, 15)), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  /** Offender explanations carry enum values; the page translates them. */
  const detailText = (detail: OffenderDetail) => {
    const params: Record<string, string | number> = { ...detail.params };
    if (
      typeof params.kind === "string" &&
      (params.kind === "HOLD" || params.kind === "QUARANTINE")
    ) {
      params.kind = domain(`holdKind.${params.kind}`);
    }
    const panel = TEST_PANELS.find((candidate) => candidate === params.panel);
    if (panel) params.panel = domain(`testPanel.${panel}`);
    if (typeof params.severity === "string") {
      const severity = params.severity;
      if (severity === "CRITICAL" || severity === "MAJOR" || severity === "MINOR") {
        params.severity = domain(`incidentSeverity.${severity}`);
      }
    }
    return t(`details.${detail.key}`, params);
  };

  const status =
    checks.criticalCount > 0
      ? {
          tone: "danger" as const,
          title: t("status.criticalTitle", { count: checks.criticalCount }),
          body: t("status.criticalBody", {
            finding: first ? t(`findings.items.${first.id}.title`) : "",
          }),
        }
      : checks.warningCount > 0
        ? {
            tone: "warning" as const,
            title: t("status.warningTitle", { count: checks.warningCount }),
            body: t("status.warningBody", {
              finding: first ? t(`findings.items.${first.id}.title`) : "",
            }),
          }
        : checks.advisoryCount > 0
          ? {
              tone: "info" as const,
              title: t("status.advisoryTitle", { count: checks.advisoryCount }),
              body: t("status.advisoryBody", {
                finding: first ? t(`findings.items.${first.id}.title`) : "",
              }),
            }
          : {
              tone: "success" as const,
              title: t("status.clearTitle"),
              body: t("status.clearBody"),
            };

  const passing = checks.findings.filter((finding) => finding.passing);
  const last30From = new Date(checks.checkedAt.getTime() - 30 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  const reconciliationColumns: Array<Column<ReconciliationLine>> = [
    {
      id: "category",
      header: t("ctls.category"),
      rowHeader: true,
      cell: (line) => (
        <Link
          href={`/inventory/units?type=${CTLS_LINE_TYPE[line.lineId]}`}
          className="font-medium text-accent-text hover:underline"
        >
          {t(`ctls.lines.${line.lineId}`)}
        </Link>
      ),
    },
    {
      id: "opening",
      header: t("ctls.opening"),
      align: "end",
      className: "tabular-nums",
      cell: (line) => format.number(line.opening, "count"),
    },
    {
      id: "additions",
      header: t("ctls.additions"),
      align: "end",
      className: "tabular-nums",
      cell: (line) => `+${format.number(line.additions, "count")}`,
    },
    {
      id: "reductions",
      header: t("ctls.reductions"),
      align: "end",
      className: "tabular-nums",
      cell: (line) => `−${format.number(line.reductions, "count")}`,
    },
    {
      id: "closing",
      header: t("ctls.closing"),
      align: "end",
      className: "tabular-nums font-semibold",
      cell: (line) => format.number(line.closing, "count"),
    },
    {
      id: "state",
      header: t("ctls.state"),
      cell: (line) =>
        line.reconciles ? (
          <Badge tone="success" icon={<CircleCheck />}>
            {t("ctls.reconciled")}
          </Badge>
        ) : (
          <Badge tone="danger" icon={<TriangleAlert />}>
            {t("ctls.notReconciled")}
          </Badge>
        ),
    },
  ];

  const monthPanel = (status_: CtlsMonthStatus, kind: "previous" | "current") => {
    const month = monthName(status_);
    return (
      <Panel key={kind}>
        <PanelHeader
          title={t(kind === "previous" ? "ctls.previousHeading" : "ctls.currentHeading", { month })}
          headingLevel={3}
        />
        <PanelBody className="space-y-4">
          <Banner
            tone={status_.reconciles ? "success" : "danger"}
            title={status_.reconciles ? t("ctls.readyTitle") : t("ctls.notReadyTitle")}
          >
            {status_.reconciles ? null : t("ctls.notReadyBody")}
            {kind === "current" ? <p>{t("ctls.inProgress")}</p> : null}
          </Banner>
          <DataTable
            caption={t("ctls.caption", { month })}
            captionHidden
            columns={reconciliationColumns}
            rows={status_.lines}
            rowKey={(line) => line.lineId}
            density="compact"
          />
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {(
              [
                ["activeAtClose", status_.activeAtClose],
                ["newUnits", status_.newUnits],
                ["destructions", status_.destructions],
                ["shipments", status_.shipments],
              ] as const
            ).map(([key, value]) => (
              <div key={key}>
                <dt className="text-fg-secondary">{t(`ctls.${key}`)}</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  <Link href={MONTH_FIGURE_HREF[key]} className="text-accent-text hover:underline">
                    {format.number(value, "count")}
                  </Link>
                </dd>
              </div>
            ))}
          </dl>
        </PanelBody>
      </Panel>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description", { when: format.dateTime(checks.checkedAt, "dateTime") })}
        className="pb-0"
      />

      <Banner tone={status.tone} title={status.title}>
        {status.body}
      </Banner>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("stats.checks")}
          value={t("stats.checksValue", {
            passing: checks.passingCount,
            total: checks.totalChecks,
          })}
          hint={t("stats.checksHint")}
          href="/compliance/audit"
          tone={checks.passingCount === checks.totalChecks ? "success" : "default"}
        />
        <StatCard
          label={t("stats.critical")}
          value={format.number(checks.criticalCount, "count")}
          hint={t("stats.criticalHint")}
          tone={checks.criticalCount > 0 ? "danger" : "success"}
        />
        <StatCard
          label={t("stats.warnings")}
          value={format.number(checks.warningCount, "count")}
          hint={t("stats.warningsHint")}
          tone={checks.warningCount > 0 ? "warning" : "success"}
        />
        <StatCard
          label={t("stats.advisories")}
          value={format.number(checks.advisoryCount, "count")}
          hint={t("stats.advisoriesHint")}
          tone={checks.advisoryCount > 0 ? "default" : "success"}
        />
      </div>

      <section aria-labelledby="findings-heading" className="space-y-3">
        <div>
          <h2 id="findings-heading" className="text-lg font-semibold text-fg">
            {t("findings.heading")}
          </h2>
          <p className="text-sm text-fg-secondary">{t("findings.description")}</p>
        </div>

        {open.length === 0 ? (
          <Banner tone="success">{t("findings.noneOpen")}</Banner>
        ) : (
          <ul className="space-y-3">
            {open.map((finding) => {
              const SeverityIcon = SEVERITY_ICON[finding.severity as Severity];
              return (
                <li key={finding.id}>
                  <Panel>
                    <PanelHeader
                      title={t(`findings.items.${finding.id}.title`)}
                      description={`${t("findings.regulationLabel")}: ${t(`findings.items.${finding.id}.regulation`)}`}
                      headingLevel={3}
                      actions={
                        <>
                          <Badge tone={SEVERITY_TONE[finding.severity]} icon={<SeverityIcon />}>
                            {t(`findings.severity.${finding.severity}`)}
                          </Badge>
                          <Badge tone="neutral">
                            {t("findings.recordCount", { count: finding.count })}
                          </Badge>
                        </>
                      }
                    />
                    <PanelBody className="space-y-3 text-sm">
                      <p className="text-fg">
                        {t(`findings.items.${finding.id}.description`, { days: days(finding.id) })}
                      </p>
                      <p className="rounded-lg border border-accent-soft-border bg-accent-soft px-3 py-2 text-accent-text">
                        <span className="font-semibold">{t("findings.nextStepLabel")}: </span>
                        {t(`findings.items.${finding.id}.nextStep`)}
                      </p>
                      {finding.offenders.length > 0 ? (
                        <div>
                          <h4 className="font-medium text-fg">{t("findings.recordsHeading")}</h4>
                          <ul className="mt-1 divide-y divide-border rounded-lg border border-border">
                            {finding.offenders.map((offender) => (
                              <li
                                key={`${finding.id}-${offender.id}-${offender.label}`}
                                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3 py-2"
                              >
                                <Link
                                  href={offender.href}
                                  className="font-medium text-accent-text hover:underline"
                                >
                                  {offender.label}
                                </Link>
                                <span className="text-fg-secondary">
                                  {detailText(offender.detail)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {finding.count > finding.offenders.length ? (
                            <p className="mt-1 text-fg-secondary">
                              {t("findings.recordsShown", {
                                shown: finding.offenders.length,
                                count: finding.count,
                              })}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </PanelBody>
                  </Panel>
                </li>
              );
            })}
          </ul>
        )}

        <details className="rounded-xl border border-border bg-surface px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-fg">
            {t("findings.passingHeading")}:{" "}
            {t("findings.passingSummary", { count: passing.length })}
          </summary>
          {passing.length === 0 ? (
            <p className="mt-2 text-sm text-fg-secondary">{t("findings.passingNone")}</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm">
              {passing.map((finding) => (
                <li key={finding.id} className="flex items-start gap-2">
                  <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                  <span>{t(`findings.items.${finding.id}.title`)}</span>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      <section aria-labelledby="ctls-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="ctls-heading" className="text-lg font-semibold text-fg">
              {t("ctls.heading")}
            </h2>
            <p className="max-w-prose text-sm text-fg-secondary">{t("ctls.description")}</p>
          </div>
          {admin ? (
            <Button href="/compliance/reports/ctls-monthly" variant="secondary" size="sm">
              {t("ctls.openReport")}
            </Button>
          ) : (
            <p className="text-sm text-fg-secondary">{t("ctls.adminOnly")}</p>
          )}
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          {monthPanel(console_.previousMonth, "previous")}
          {monthPanel(console_.currentMonth, "current")}
        </div>
      </section>

      <section aria-labelledby="destruction-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="destruction-heading" className="text-lg font-semibold text-fg">
              {t("destruction.heading")}
            </h2>
            <p className="max-w-prose text-sm text-fg-secondary">{t("destruction.description")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href="/inventory/destroyed" variant="secondary" size="sm">
              {t("destruction.openRegister")}
            </Button>
            {admin ? (
              <Button href="/compliance/reports/destruction-register" variant="ghost" size="sm">
                {t("destruction.openReport")}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label={t("destruction.total")}
            value={format.number(destruction.total, "count")}
            href="/inventory/destroyed"
          />
          <StatCard
            label={t("destruction.last30")}
            value={format.number(destruction.last30Days, "count")}
            href={`/inventory/destroyed?from=${last30From}`}
          />
          <StatCard
            label={t("destruction.latest")}
            value={
              destruction.lastDestroyedAt
                ? format.dateTime(destruction.lastDestroyedAt, "date")
                : t("destruction.latestNone")
            }
            href="/inventory/destroyed"
          />
          <StatCard
            label={t("destruction.undocumented")}
            value={format.number(destruction.undocumented, "count")}
            hint={
              destruction.undocumented === 0 ? t("destruction.okHint") : t("destruction.fixHint")
            }
            href="/inventory/destroyed"
            tone={destruction.undocumented === 0 ? "success" : "danger"}
          />
          <StatCard
            label={t("destruction.late", { days: STALE_DESTRUCTION_DAYS })}
            value={format.number(destruction.filedLate, "count")}
            hint={destruction.filedLate === 0 ? t("destruction.okHint") : t("destruction.fixHint")}
            href="/inventory/destroyed"
            tone={destruction.filedLate === 0 ? "success" : "warning"}
          />
        </div>
      </section>

      <AuditSection chain={chain} admin={admin} />
    </div>
  );
}

const TEST_PANELS = [
  "POTENCY",
  "TERPENES",
  "PESTICIDES",
  "HEAVY_METALS",
  "MICROBIALS",
  "MYCOTOXINS",
  "MOISTURE",
  "FOREIGN",
  "OTHER",
] as const;

async function AuditSection({
  chain,
  admin,
}: {
  chain: Awaited<ReturnType<typeof getComplianceConsole>>["chain"];
  admin: boolean;
}) {
  const t = await getTranslations("activity.chain");
  return (
    <section aria-labelledby="audit-heading" className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="audit-heading" className="text-lg font-semibold text-fg">
            {t("heading")}
          </h2>
          <p className="max-w-prose text-sm text-fg-secondary">{t("description")}</p>
        </div>
        {admin ? (
          <Button href="/compliance/audit" variant="secondary" size="sm">
            {t("openTrail")}
          </Button>
        ) : null}
      </div>
      {admin ? (
        <>
          <AuditChainResult status={chain} />
          <p className="text-sm text-fg-secondary">{t("tailNote")}</p>
        </>
      ) : (
        <p className="text-sm text-fg-secondary">{t("adminOnly")}</p>
      )}
    </section>
  );
}
