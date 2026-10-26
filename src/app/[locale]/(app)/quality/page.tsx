export const dynamic = "force-dynamic";

import { FlaskConical, ShieldAlert, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { OpenIncidentButton, PlaceHoldButton, UpdateIncidentButton } from "@/components/QaDialogs";
import { ConfirmAction } from "@/components/ConfirmAction";
import { EntityLink } from "@/components/page/EntityLink";
import { FilterBar } from "@/components/page/FilterBar";
import { SearchForm } from "@/components/page/SearchForm";
import { StatCard } from "@/components/page/StatCard";
import {
  HoldBadge,
  SeverityBadge,
  UnitTypeBadge,
  VerdictBadge,
} from "@/components/page/domain-badges";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import {
  getQaOverview,
  QA_HOLD_KINDS,
  QA_SEVERITIES,
  QA_SORTS,
  QA_TEST_VERDICTS,
  QA_VIEWS,
  type QaHoldRow,
  type QaIncidentRow,
  type QaTestRow,
  type QaView,
} from "@/features/qa/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { isAdmin, requirePageUser } from "@/lib/auth";
import { buildListUrl, parseListParams, pickParam } from "@/lib/list-params";

const BASE = "/quality";
type SearchParams = Record<string, string | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("qa.page");
  return { title: t("pageTitle") };
}

export default async function QualityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const raw = await searchParams;
  const t = await getTranslations("qa.page");
  const domain = await getTranslations("domain");
  const format = await getFormatter();

  const view: QaView = pickParam(raw.view, QA_VIEWS) ?? "overview";
  const list = parseListParams(raw, { sort: "" });
  const single = view !== "overview";
  const sort = single ? (pickParam(list.sort, QA_SORTS[view]) ?? QA_SORTS[view][0]) : undefined;
  const holdKind = pickParam(raw.holdKind, QA_HOLD_KINDS);
  const verdict = pickParam(raw.verdict, QA_TEST_VERDICTS);
  const severity = pickParam(raw.severity, QA_SEVERITIES);

  const data = await getQaOverview(user, {
    view,
    q: list.q,
    sort,
    order: list.order,
    page: list.page,
    limit: list.limit,
    holdKind,
    verdict,
    severity,
  });

  const current = {
    view: single ? view : undefined,
    q: list.q,
    sort,
    order: sort ? list.order : undefined,
    holdKind: view === "holds" ? holdKind : undefined,
    verdict: view === "tests" ? verdict : undefined,
    severity: view === "incidents" ? severity : undefined,
  };
  const href = (overrides: Record<string, string | number | undefined | null>) =>
    buildListUrl(BASE, current, { page: undefined, ...overrides });
  const viewHref = (target: QaView, extra: Record<string, string | undefined> = {}) =>
    buildListUrl(BASE, { view: target === "overview" ? undefined : target, q: list.q, ...extra });
  const admin = isAdmin(user);
  const searched = Boolean(list.q);
  const sortProps = single
    ? {
        sort: { sort, order: list.order },
        buildSortHref: (key: string, order: "asc" | "desc") => href({ sort: key, order }),
      }
    : {};

  const when = (date: Date) => (
    <time dateTime={date.toISOString()}>{format.dateTime(date, "dateTime")}</time>
  );
  const unitLink = (unit: { id: number; name: string }) => (
    <Link
      href={`/inventory/units/${unit.id}`}
      className="font-medium text-accent-text hover:underline"
    >
      {unit.name}
    </Link>
  );

  const holdColumns: Array<Column<QaHoldRow>> = [
    {
      id: "unit",
      header: t("holds.columns.unit"),
      sortKey: "unit",
      rowHeader: true,
      cell: (h) => (
        <span className="flex flex-wrap items-center gap-2">
          {unitLink(h.unit)}
          <UnitTypeBadge type={h.unit.type} />
        </span>
      ),
    },
    {
      id: "kind",
      header: t("holds.columns.kind"),
      sortKey: "kind",
      cell: (h) => <HoldBadge kind={h.kind} />,
    },
    {
      id: "reason",
      header: t("holds.columns.reason"),
      cell: (h) => (
        <>
          {h.reason}
          <span className="block text-fg-secondary">{domain(`holdOrigin.${h.origin}`)}</span>
        </>
      ),
    },
    {
      id: "location",
      header: t("holds.columns.location"),
      cell: (h) =>
        h.locationName ? (
          <EntityLink kind="location" id={h.locationId} className="font-normal">
            {h.locationName}
          </EntityLink>
        ) : (
          domain("empty")
        ),
    },
    {
      id: "placed",
      header: t("holds.columns.placed"),
      cell: (h) => (
        <>
          {when(h.placedAt)}
          <EntityLink kind="member" id={h.placedById} className="block font-normal">
            {h.placedBy}
          </EntityLink>
        </>
      ),
    },
    {
      id: "age",
      header: t("holds.columns.age"),
      sortKey: "age",
      cell: (h) =>
        h.ageDays === 0 ? t("holds.ageToday") : t("holds.ageDays", { days: h.ageDays }),
    },
    ...(admin
      ? [
          {
            id: "actions",
            header: t("columns.actions"),
            hideHeader: true,
            cell: (h: QaHoldRow) => (
              <ConfirmAction
                label={t("holds.release")}
                ariaLabel={t("holds.releaseFor", { name: h.unit.name })}
                url={`/api/units/${h.unit.id}/hold`}
                body={{ action: "release" }}
                reasonField="reason"
                requireReason
                reasonMinLength={10}
                reasonLabel={t("holds.releaseReason")}
                title={t("holds.releaseTitle", { name: h.unit.name })}
                description={t("holds.releaseBody")}
                confirmLabel={t("holds.release")}
                tone="primary"
                doneMessage={t("holds.released", { name: h.unit.name })}
              />
            ),
          } satisfies Column<QaHoldRow>,
        ]
      : []),
  ];

  const testColumns: Array<Column<QaTestRow>> = [
    {
      id: "unit",
      header: t("tests.columns.unit"),
      sortKey: "unit",
      rowHeader: true,
      cell: (r) => unitLink(r.unit),
    },
    {
      id: "panel",
      header: t("tests.columns.panel"),
      sortKey: "panel",
      cell: (r) => (
        <Link href={`/inventory/units/${r.unit.id}`} className="hover:underline">
          {domain(`testPanel.${r.panel}`)}
          <span className="block text-fg-secondary">{r.analyte}</span>
        </Link>
      ),
    },
    {
      id: "result",
      header: t("tests.columns.result"),
      cell: (r) => (
        <>
          {r.value === null
            ? domain("empty")
            : `${format.number(r.value)}${r.uom ? ` ${r.uom}` : ""}`}
          {r.limitMin !== null || r.limitMax !== null ? (
            <span className="block text-fg-secondary">
              {t("tests.limits", {
                min: r.limitMin === null ? domain("empty") : format.number(r.limitMin),
                max: r.limitMax === null ? domain("empty") : format.number(r.limitMax),
              })}
            </span>
          ) : null}
        </>
      ),
    },
    {
      id: "verdict",
      header: t("tests.columns.verdict"),
      sortKey: "verdict",
      cell: (r) => <VerdictBadge verdict={r.verdict} />,
    },
    {
      id: "lab",
      header: t("tests.columns.lab"),
      cell: (r) =>
        r.labName ? (
          <EntityLink kind="organization" id={r.labId} className="font-normal">
            {r.labName}
          </EntityLink>
        ) : (
          domain("empty")
        ),
    },
    {
      id: "date",
      header: t("tests.columns.date"),
      sortKey: "date",
      cell: (r) => (
        <>
          {when(r.testedAt)}
          <EntityLink kind="member" id={r.recordedBy.id} className="block font-normal">
            {r.recordedBy.name}
          </EntityLink>
        </>
      ),
    },
    {
      id: "actions",
      header: t("columns.actions"),
      hideHeader: true,
      cell: (r) =>
        admin || r.recordedBy.id === user.id ? (
          <ConfirmAction
            label={t("void")}
            ariaLabel={t("tests.voidFor", { analyte: r.analyte, name: r.unit.name })}
            url={`/api/qa/tests/${r.id}/void`}
            reasonField="reason"
            requireReason
            reasonMinLength={10}
            title={t("tests.voidTitle", { analyte: r.analyte, name: r.unit.name })}
            description={t("tests.voidBody")}
            confirmLabel={t("void")}
            doneMessage={t("tests.voided")}
          />
        ) : null,
    },
  ];

  const incidentColumns: Array<Column<QaIncidentRow>> = [
    {
      id: "title",
      header: t("incidents.columns.title"),
      sortKey: "title",
      rowHeader: true,
      cell: (i) => (
        <>
          {i.unit ? (
            <Link href={`/inventory/units/${i.unit.id}`} className="hover:underline">
              {i.title}
            </Link>
          ) : (
            i.title
          )}
          <span className="line-clamp-2 block font-normal text-fg-secondary">{i.description}</span>
        </>
      ),
    },
    {
      id: "severity",
      header: t("incidents.columns.severity"),
      sortKey: "severity",
      cell: (i) => <SeverityBadge severity={i.severity} />,
    },
    {
      id: "status",
      header: t("incidents.columns.status"),
      sortKey: "status",
      cell: (i) => (
        <Badge tone={i.status === "INVESTIGATING" ? "info" : "neutral"}>
          {domain(`incidentStatus.${i.status}`)}
        </Badge>
      ),
    },
    {
      id: "unit",
      header: t("incidents.columns.unit"),
      cell: (i) =>
        i.unit ? (
          unitLink(i.unit)
        ) : i.cultivar ? (
          <EntityLink kind="cultivar" id={i.cultivar.id}>
            {i.cultivar.name}
          </EntityLink>
        ) : i.experiment ? (
          <EntityLink kind="experiment" id={i.experiment.id}>
            {i.experiment.ecode}
          </EntityLink>
        ) : (
          domain("empty")
        ),
    },
    {
      id: "opened",
      header: t("incidents.columns.opened"),
      sortKey: "date",
      cell: (i) => (
        <>
          {when(i.createdAt)}
          <EntityLink kind="member" id={i.openedById} className="block font-normal">
            {i.openedBy}
          </EntityLink>
        </>
      ),
    },
    {
      id: "actions",
      header: t("columns.actions"),
      hideHeader: true,
      cell: (i) => (
        <span className="flex flex-wrap gap-2">
          <UpdateIncidentButton
            id={i.id}
            title={i.title}
            status={i.status}
            resolution={i.resolution}
          />
          {admin ? (
            <ConfirmAction
              label={t("void")}
              ariaLabel={t("incidents.voidFor", { title: i.title })}
              url={`/api/qa/incidents/${i.id}/void`}
              reasonField="reason"
              requireReason
              reasonMinLength={10}
              title={t("incidents.voidTitle", { title: i.title })}
              description={t("incidents.voidBody")}
              confirmLabel={t("void")}
              doneMessage={t("incidents.voided")}
            />
          ) : null}
        </span>
      ),
    },
  ];

  const emptyFor = (kind: "holds" | "tests" | "incidents", icon: React.ReactNode) =>
    searched ? (
      <EmptyState
        icon={icon}
        title={t("noMatchTitle")}
        description={t("noMatchBody")}
        action={
          <Button
            href={buildListUrl(BASE, { view: single ? view : undefined })}
            variant="secondary"
          >
            {t("clearSearch")}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={icon}
        title={t(`${kind}.emptyTitle`)}
        description={t(`${kind}.emptyBody`)}
      />
    );

  const sectionHeading = (
    id: string,
    title: string,
    total: number,
    target: QaView,
    shown: number
  ) => (
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={id} className="text-lg font-semibold text-fg">
        {title}{" "}
        {single ? (
          <span className="font-normal text-fg-secondary">({format.number(total, "count")})</span>
        ) : (
          <Link
            href={viewHref(target)}
            className="font-normal text-fg-secondary hover:text-accent-text hover:underline"
          >
            ({format.number(total, "count")})
          </Link>
        )}
      </h2>
      {!single && total > shown ? (
        <Link
          href={viewHref(target)}
          className="text-sm font-medium text-accent-text hover:underline"
        >
          {t("viewAll", { count: total })}
        </Link>
      ) : null}
    </div>
  );

  const show = (target: "holds" | "tests" | "incidents") => view === "overview" || view === target;
  const pager = (target: "holds" | "tests" | "incidents") =>
    view === target ? (
      <Pagination
        className="mt-4"
        page={list.page}
        pageSize={list.limit}
        total={data[target].total}
        buildHref={(page) => buildListUrl(BASE, { ...current, limit: list.limit }, { page })}
      />
    ) : null;

  const { counts } = data;
  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <PlaceHoldButton />
            <OpenIncidentButton />
          </>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("stats.holds")}
          value={format.number(counts.holds, "count")}
          hint={t("stats.holdsHint", { count: counts.quarantines })}
          href={viewHref("holds")}
          tone={counts.holds > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("stats.tests")}
          value={format.number(counts.failedTests, "count")}
          hint={t("stats.testsHint", { count: counts.pendingTests })}
          href={viewHref("tests", { verdict: "FAIL" })}
          tone={counts.failedTests > 0 ? "danger" : "default"}
        />
        <StatCard
          label={t("stats.incidents")}
          value={format.number(counts.openIncidents, "count")}
          hint={t("stats.incidentsHint", { count: counts.criticalIncidents })}
          href={viewHref("incidents")}
          tone={counts.criticalIncidents > 0 ? "danger" : "default"}
        />
      </div>

      <FilterBar
        search={
          <SearchForm
            action={BASE}
            params={current}
            q={list.q}
            label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
          />
        }
      >
        <FilterChips
          label={t("viewLabel")}
          chips={QA_VIEWS.map((key) => ({
            key,
            label: t(`views.${key}`),
            active: view === key,
            href: viewHref(key),
          }))}
        />
        {view === "holds" ? (
          <FilterChips
            label={t("holds.kindLabel")}
            clearHref={holdKind ? href({ holdKind: undefined }) : undefined}
            chips={QA_HOLD_KINDS.map((key) => ({
              key,
              label: domain(`holdKind.${key}`),
              active: holdKind === key,
              href: href({ holdKind: holdKind === key ? undefined : key }),
            }))}
          />
        ) : null}
        {view === "tests" ? (
          <FilterChips
            label={t("tests.verdictLabel")}
            clearHref={verdict ? href({ verdict: undefined }) : undefined}
            chips={QA_TEST_VERDICTS.map((key) => ({
              key,
              label: domain(`testVerdict.${key}`),
              active: verdict === key,
              href: href({ verdict: verdict === key ? undefined : key }),
            }))}
          />
        ) : null}
        {view === "incidents" ? (
          <FilterChips
            label={t("incidents.severityLabel")}
            clearHref={severity ? href({ severity: undefined }) : undefined}
            chips={QA_SEVERITIES.map((key) => ({
              key,
              label: domain(`incidentSeverity.${key}`),
              active: severity === key,
              href: href({ severity: severity === key ? undefined : key }),
            }))}
          />
        ) : null}
      </FilterBar>

      <div className="space-y-8">
        {show("holds") ? (
          <section aria-labelledby="holds-heading">
            {sectionHeading(
              "holds-heading",
              t("holds.title"),
              data.holds.total,
              "holds",
              data.holds.rows.length
            )}
            <DataTable
              clientPaging={false}
              caption={t("holds.caption")}
              captionHidden
              columns={holdColumns}
              rows={data.holds.rows}
              rowKey={(h) => h.holdId}
              empty={emptyFor("holds", <ShieldAlert />)}
              {...sortProps}
            />
            {pager("holds")}
          </section>
        ) : null}

        {show("tests") ? (
          <section aria-labelledby="tests-heading">
            {sectionHeading(
              "tests-heading",
              t("tests.title"),
              data.tests.total,
              "tests",
              data.tests.rows.length
            )}
            <DataTable
              clientPaging={false}
              caption={t("tests.caption")}
              captionHidden
              columns={testColumns}
              rows={data.tests.rows}
              rowKey={(r) => r.id}
              empty={emptyFor("tests", <FlaskConical />)}
              {...sortProps}
            />
            {pager("tests")}
          </section>
        ) : null}

        {show("incidents") ? (
          <section aria-labelledby="incidents-heading">
            {sectionHeading(
              "incidents-heading",
              t("incidents.title"),
              data.incidents.total,
              "incidents",
              data.incidents.rows.length
            )}
            <DataTable
              clientPaging={false}
              caption={t("incidents.caption")}
              captionHidden
              columns={incidentColumns}
              rows={data.incidents.rows}
              rowKey={(i) => i.id}
              empty={emptyFor("incidents", <TriangleAlert />)}
              {...sortProps}
            />
            {pager("incidents")}
          </section>
        ) : null}
      </div>
    </div>
  );
}
