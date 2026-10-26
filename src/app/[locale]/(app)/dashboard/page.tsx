export const dynamic = "force-dynamic";

import {
  ArrowUpRight,
  ChevronRight,
  CircleCheck,
  FlaskConical,
  Microscope,
  TriangleAlert,
} from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { AuditActionBadge } from "@/components/AuditLabels";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarChart, type BarItem } from "@/components/charts/BarChart";
import { DonutChart, type DonutSlice } from "@/components/charts/DonutChart";
import { EntityLink } from "@/components/page/EntityLink";
import { GaugeChart } from "@/components/charts/GaugeChart";
import { CYCLE, glow, GRADIENTS, STATUS, type Gradient } from "@/components/charts/palette";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { auditEntityHref } from "@/features/audit/links";
import {
  ATTENTION_HREF,
  ATTENTION_PRIORITY,
  nextBestStep,
  type AttentionKind,
} from "@/features/dashboard/attention";
import { ACTIVITY_DAYS, ENDING_SOON_DAYS, getDashboard } from "@/features/dashboard/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("pageTitle") };
}

/** Colour of an attention row's dot: a failed result is danger, other open work is a warning. */
function dotFor(kind: AttentionKind, count: number): string {
  if (count === 0) return "bg-success-solid";
  if (kind === "failedTests") return "bg-danger-solid";
  if (kind === "inTransit" || kind === "endingSoonExperiments") return "bg-fg-tertiary";
  return "bg-warning-solid";
}

const VERDICT_GRADIENT = {
  PASS: STATUS.good,
  FAIL: STATUS.bad,
  INCONCLUSIVE: STATUS.caution,
  RECORDED: STATUS.neutral,
} as const;

/** A location bar turns amber near capacity and red at it; the figure beside it says the same in words. */
function occupancyGradient(count: number, capacity: number | null): Gradient {
  if (!capacity) return GRADIENTS.ocean;
  if (count >= capacity) return STATUS.bad;
  if (count / capacity >= 0.8) return STATUS.caution;
  return GRADIENTS.ocean;
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const t = await getTranslations("dashboard");
  const domain = await getTranslations("domain");
  const format = await getFormatter();

  const data = await getDashboard(user);
  const step = nextBestStep(data.attention);
  const { inventory } = data;
  const count = (value: number) => format.number(value, "count");

  const typeSlices: DonutSlice[] = inventory.byType.map(({ key, count: n }, index) => ({
    key,
    label: domain(`unitTypePlural.${key}`),
    value: n,
    gradient: CYCLE[index % CYCLE.length]!,
    href: `/inventory/units?type=${key}`,
  }));
  const stageBars: BarItem[] = inventory.byStage.map(({ key, count: n }) => ({
    key,
    label: key === "NONE" ? t("inventory.noStage") : domain(`growthStage.${key}`),
    value: n,
    href: key === "NONE" ? undefined : `/inventory/units?stage=${key}`,
  }));
  const locationBars: BarItem[] = [
    ...inventory.byLocation.map((location) => ({
      key: String(location.id),
      label: location.name,
      value: location.count,
      max: location.capacity,
      note: location.capacity
        ? t("charts.location.capacityNote", { capacity: count(location.capacity) })
        : undefined,
      gradient: occupancyGradient(location.count, location.capacity),
      href: `/inventory/units?location=${location.id}`,
    })),
    ...(inventory.unlocated > 0
      ? [{ key: "none", label: t("inventory.noLocation"), value: inventory.unlocated }]
      : []),
  ];

  const passed = data.results.find(({ verdict }) => verdict === "PASS")?.count ?? 0;
  const failed = data.results.find(({ verdict }) => verdict === "FAIL")?.count ?? 0;
  const decided = passed + failed;
  const passRate = decided > 0 ? passed / decided : 0;

  const activityTotal = data.activity.reduce((sum, day) => sum + day.value, 0);
  const busiest = data.activity.reduce((best, day) => (day.value > best.value ? day : best));

  const today = format.dateTime(new Date(), { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-10">
      <PageHeader
        kicker={today}
        title={
          <>
            {t("hero.lead")}{" "}
            <span className="font-serif font-normal tracking-[-0.02em] text-fg-secondary italic">
              {t("hero.accent")}
            </span>
          </>
        }
        description={t("description")}
        className="pb-0"
      />

      <section aria-labelledby="charts-heading" className="space-y-6">
        <h2 id="charts-heading" className="sr-only">
          {t("charts.heading")}
        </h2>
        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="chart-glow lg:col-span-2">
            <PanelHeader
              title={t("charts.activity.title")}
              description={t("charts.activity.description", { days: ACTIVITY_DAYS })}
              headingLevel={3}
            />
            <PanelBody className="space-y-5">
              <dl className="grid grid-cols-3 gap-4">
                <ChartStat
                  label={t("charts.activity.total")}
                  value={count(activityTotal)}
                  href="/compliance/audit"
                />
                <ChartStat
                  label={t("charts.activity.average")}
                  value={format.number(activityTotal / ACTIVITY_DAYS, {
                    maximumFractionDigits: 1,
                  })}
                  href="/compliance/audit"
                />
                <ChartStat
                  label={t("charts.activity.peak")}
                  value={t("charts.activity.peakValue", {
                    count: busiest.value,
                    date: format.dateTime(busiest.date, { day: "numeric", month: "short" }),
                  })}
                  href="/compliance/audit"
                  small
                />
              </dl>
              <AreaChart
                label={t("charts.activity.title")}
                valueLabel={t("charts.activity.unit")}
                points={data.activity}
              />
            </PanelBody>
          </Panel>

          <Panel className="chart-glow">
            <PanelHeader title={t("inventory.byType")} headingLevel={3} />
            <PanelBody>
              {inventory.total === 0 ? (
                <EmptyState
                  icon={<Microscope />}
                  title={t("inventory.emptyTitle")}
                  description={t("inventory.emptyBody")}
                  headingLevel={4}
                  className="py-6"
                />
              ) : (
                <DonutChart
                  label={t("inventory.byType")}
                  slices={typeSlices}
                  centerValue={count(inventory.total)}
                  centerLabel={t("charts.unitsCenter")}
                  className="sm:flex-col"
                />
              )}
            </PanelBody>
          </Panel>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Panel className="chart-glow">
            <PanelHeader
              title={t("charts.results.title")}
              description={t("charts.results.description")}
              headingLevel={3}
            />
            <PanelBody className="space-y-5">
              {data.results.every(({ count: n }) => n === 0) ? (
                <p className="text-sm text-fg-secondary">{t("charts.results.empty")}</p>
              ) : (
                <>
                  <Link
                    href="/quality?view=tests"
                    className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
                  >
                    <GaugeChart
                      label={`${t("charts.results.passRate")}: ${format.number(passRate, "percent")}`}
                      value={passRate}
                      display={decided > 0 ? format.number(passRate, "percent") : "–"}
                      caption={t("charts.results.passRate")}
                      gradient={STATUS.good}
                    />
                  </Link>
                  <p className="text-center text-sm text-fg-secondary">
                    <Link href="/quality?view=tests" className="hover:underline">
                      {decided > 0
                        ? t("charts.results.hint", {
                            passed: count(passed),
                            decided: count(decided),
                          })
                        : t("charts.results.none")}
                    </Link>
                  </p>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-4 text-sm">
                    {data.results.map(({ verdict, count: n }) => (
                      <li key={verdict} className="flex items-center gap-2.5">
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-full"
                          style={{
                            background: `linear-gradient(135deg, ${VERDICT_GRADIENT[verdict][0]}, ${VERDICT_GRADIENT[verdict][1]})`,
                            boxShadow: `0 0 8px -1px ${glow(VERDICT_GRADIENT[verdict][1], 60)}`,
                          }}
                        />
                        <Link
                          href={`/quality?view=tests&verdict=${verdict}`}
                          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-sm text-fg-secondary hover:text-accent-text hover:underline"
                        >
                          <span className="min-w-0 flex-1">{domain(`testVerdict.${verdict}`)}</span>
                          <span className="font-semibold text-fg tabular-nums">{count(n)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </PanelBody>
          </Panel>

          <Panel className="chart-glow">
            <PanelHeader title={t("inventory.byStage")} headingLevel={3} />
            <PanelBody>
              <BarChart label={t("inventory.byStage")} items={stageBars} />
            </PanelBody>
          </Panel>

          <Panel className="chart-glow">
            <PanelHeader
              title={t("charts.location.title")}
              description={t("charts.location.description")}
              headingLevel={3}
            />
            <PanelBody className="space-y-3">
              <BarChart label={t("charts.location.title")} items={locationBars} />
              {inventory.otherLocations.locations > 0 ? (
                <p className="text-sm text-fg-secondary">
                  {t("inventory.otherLocations", { locations: inventory.otherLocations.locations })}
                  {" · "}
                  {count(inventory.otherLocations.units)}
                </p>
              ) : null}
            </PanelBody>
          </Panel>
        </div>
      </section>

      <section
        aria-labelledby="next-step-heading"
        className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl border [&>svg]:size-5",
              step
                ? "border-warning-soft-border bg-warning-soft text-warning"
                : "border-success-soft-border bg-success-soft text-success"
            )}
          >
            {step ? <TriangleAlert /> : <CircleCheck />}
          </span>
          <div className="min-w-0">
            <p
              id="next-step-heading"
              className="font-mono text-xs tracking-[0.14em] text-accent-text uppercase"
            >
              {step ? t("nextStep.heading") : t("hero.allClearKicker")}
            </p>
            <h2 className="mt-1.5 text-xl leading-snug font-semibold tracking-[-0.02em] text-balance text-fg">
              {step
                ? t(`nextStep.${step.kind}.title`, { count: step.count, days: ENDING_SOON_DAYS })
                : t("nextStep.allClearTitle")}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-pretty text-fg-secondary">
              {step ? t(`nextStep.${step.kind}.why`) : t("nextStep.allClearBody")}
            </p>
          </div>
        </div>
        {step ? (
          <Button href={step.href} variant="primary" iconAfter={<ArrowUpRight />}>
            {t("nextStep.open")}
          </Button>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={t("attention.heading")} description={t("attention.description")} />
          <ul className="divide-y divide-border">
            {ATTENTION_PRIORITY.map((kind) => {
              const value = data.attention[kind];
              return (
                <li key={kind}>
                  <Link
                    href={ATTENTION_HREF[kind]}
                    className="group flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none sm:px-6"
                  >
                    <span
                      aria-hidden="true"
                      className={cn("size-2.5 shrink-0 rounded-full", dotFor(kind, value))}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-fg">
                        {t(`attention.cards.${kind}.label`)}
                      </span>
                      <span className="block text-sm text-pretty text-fg-secondary">
                        {value > 0
                          ? t(`attention.cards.${kind}.hint`, { days: ENDING_SOON_DAYS })
                          : t(`attention.cards.${kind}.none`, { days: ENDING_SOON_DAYS })}
                      </span>
                    </span>
                    <span className="text-2xl font-semibold tracking-[-0.03em] text-fg tabular-nums">
                      {count(value)}
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-fg-tertiary transition-transform group-hover:translate-x-0.5 rtl:rotate-180 motion-reduce:transition-none"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel>
          <PanelHeader
            title={t("experiments.heading")}
            description={t("experiments.description", { count: data.runningExperimentCount })}
            actions={
              <Button href="/inventory/experiments" variant="ghost" size="sm">
                {t("experiments.viewAll")}
              </Button>
            }
          />
          {data.runningExperiments.length === 0 ? (
            <EmptyState
              icon={<FlaskConical />}
              title={t("experiments.emptyTitle")}
              description={t("experiments.emptyBody")}
              action={
                <Button href="/inventory/experiments" variant="primary">
                  {t("experiments.emptyAction")}
                </Button>
              }
              headingLevel={3}
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.runningExperiments.map((experiment) => (
                <li key={experiment.id} className="px-5 py-4 sm:px-6">
                  <Link
                    href={`/inventory/experiments/${experiment.id}`}
                    className="font-medium text-accent-text hover:underline"
                  >
                    <span className="font-mono">{experiment.ecode}</span> {experiment.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-fg-secondary">
                    <Link
                      href={`/inventory/experiments/${experiment.id}`}
                      className="hover:text-accent-text hover:underline"
                    >
                      {t("experiments.units", { count: experiment.activeUnits })}
                    </Link>
                    {" · "}
                    {experiment.endDate
                      ? t("experiments.ends", {
                          date: format.dateTime(experiment.endDate, "date"),
                        })
                      : t("experiments.noEnd")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title={t("recent.heading")}
          description={
            data.recent.kind === "audit"
              ? t("recent.auditDescription")
              : t("recent.eventsDescription")
          }
          actions={
            <Button
              href={data.recent.kind === "audit" ? "/compliance/audit" : "/inventory/units"}
              variant="ghost"
              size="sm"
            >
              {data.recent.kind === "audit" ? t("recent.auditLink") : t("recent.eventsLink")}
            </Button>
          }
        />
        {data.recent.kind === "audit" ? (
          data.recent.entries.length === 0 ? (
            <RecentEmpty t={t} />
          ) : (
            <ul className="divide-y divide-border">
              {data.recent.entries.map((entry) => {
                const href = auditEntityHref(entry.entityType, entry.entityId);
                return (
                  <li key={entry.id} className="px-5 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <AuditActionBadge action={entry.action} />
                      {href ? (
                        <Link href={href} className="font-medium text-accent-text hover:underline">
                          {entry.entityLabel}
                        </Link>
                      ) : (
                        <span className="font-medium text-fg">{entry.entityLabel}</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-fg">{entry.summary}</p>
                    <p className="mt-0.5 text-sm text-fg-secondary">
                      <EntityLink kind="member" id={entry.actorId} className="font-normal">
                        {t("recent.by", { name: entry.actorName })}
                      </EntityLink>
                      {" · "}
                      <time dateTime={entry.createdAt.toISOString()}>
                        {format.dateTime(entry.createdAt, "dateTime")}
                      </time>
                    </p>
                  </li>
                );
              })}
            </ul>
          )
        ) : data.recent.events.length === 0 ? (
          <RecentEmpty t={t} />
        ) : (
          <ul className="divide-y divide-border">
            {data.recent.events.map((event) => (
              <li key={event.id} className="px-5 py-4 sm:px-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-fg-secondary">
                    {domain(`stateKind.${event.kind}`)}
                  </span>
                  <Link
                    href={`/inventory/units/${event.unitId}`}
                    className="font-medium text-accent-text hover:underline"
                  >
                    {event.unitName}
                  </Link>
                </div>
                <p className="mt-0.5 text-sm text-fg-secondary">
                  {t("recent.by", { name: event.actorName })}
                  {event.locationName
                    ? ` · ${t("recent.at", { location: event.locationName })}`
                    : ""}
                  {" · "}
                  <time dateTime={event.recordedAt.toISOString()}>
                    {format.dateTime(event.recordedAt, "dateTime")}
                  </time>
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function ChartStat({
  label,
  value,
  href,
  small,
}: {
  label: string;
  value: string;
  href: string;
  small?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fg-secondary">{label}</dt>
      <dd
        className={cn(
          "mt-1 font-semibold tracking-[-0.03em] text-fg tabular-nums",
          small ? "text-base leading-8" : "text-3xl"
        )}
      >
        <Link href={href} className="hover:text-accent-text hover:underline">
          {value}
        </Link>
      </dd>
    </div>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"dashboard">>>;

function RecentEmpty({ t }: { t: T }) {
  return (
    <EmptyState
      title={t("recent.emptyTitle")}
      description={t("recent.emptyBody")}
      headingLevel={3}
    />
  );
}
