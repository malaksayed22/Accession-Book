export const dynamic = "force-dynamic";

import { FlaskConical, Plus } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { ExperimentCard } from "@/components/experiment/ExperimentCard";
import { EntityLink } from "@/components/page/EntityLink";
import { ExperimentStatusBadge } from "@/components/experiment/ExperimentStatusBadge";
import { FilterBar } from "@/components/page/FilterBar";
import { SearchForm } from "@/components/page/SearchForm";
import { SelectFilter } from "@/components/page/SelectFilter";
import { ViewModeToggle, parseViewMode } from "@/components/ViewModeToggle";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import { Panel } from "@/components/ui/Panel";
import { CALENDAR_DAY_FORMAT } from "@/features/experiment/dates";
import {
  EXPERIMENT_LIST_SORTS,
  EXPERIMENT_LIST_STATUSES,
  listExperiments,
  type ExperimentListRow,
} from "@/features/experiment/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/lib/auth";
import { buildListUrl, parseListParams, pickParam } from "@/lib/list-params";

const BASE = "/inventory/experiments";

type SearchParams = Record<string, string | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("experiments.list");
  return { title: t("pageTitle") };
}

export default async function ExperimentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const raw = await searchParams;
  const t = await getTranslations("experiments.list");
  const domain = await getTranslations("domain");
  const format = await getFormatter();

  const list = parseListParams(raw, { sort: "date", order: "desc" });
  const sort = pickParam(list.sort, EXPERIMENT_LIST_SORTS) ?? "date";
  const status = pickParam(raw.status, EXPERIMENT_LIST_STATUSES);
  const mine = raw.mine === "1";
  const view = parseViewMode(raw.view);

  const { rows, total } = await listExperiments(user, {
    q: list.q,
    status,
    mine,
    sort,
    order: list.order,
    page: list.page,
    limit: list.limit,
  });

  const current = {
    q: list.q,
    status,
    mine: mine ? "1" : undefined,
    sort,
    order: list.order,
    view: view === "cards" ? undefined : view,
    limit: raw.limit ? list.limit : undefined,
  };
  const href = (overrides: Record<string, string | number | undefined | null>) =>
    buildListUrl(BASE, current, { page: undefined, ...overrides });
  const filtered = Boolean(list.q || status || mine);

  const sortOptions = EXPERIMENT_LIST_SORTS.flatMap((key) =>
    (["asc", "desc"] as const).map((order) => ({
      value: `${key}:${order}`,
      label: t(`sortOptions.${key}-${order}`),
      href: href({ sort: key, order }),
    }))
  );

  const columns: Array<Column<ExperimentListRow>> = [
    {
      id: "code",
      header: t("columns.code"),
      sortKey: "code",
      rowHeader: true,
      cell: (e) => (
        <Link
          href={`/inventory/experiments/${e.id}`}
          className="font-mono font-semibold text-accent-text hover:underline"
        >
          {e.ecode}
        </Link>
      ),
    },
    {
      id: "name",
      header: t("columns.name"),
      sortKey: "name",
      cell: (e) => (
        <EntityLink kind="experiment" id={e.id}>
          {e.name}
        </EntityLink>
      ),
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: (e) => <ExperimentStatusBadge status={e.status} />,
    },
    {
      id: "period",
      header: t("columns.period"),
      sortKey: "date",
      cell: (e) => (
        <span className="whitespace-nowrap">
          {format.dateTime(e.startDate, CALENDAR_DAY_FORMAT)}
          {" – "}
          {e.endDate ? format.dateTime(e.endDate, CALENDAR_DAY_FORMAT) : t("ongoing")}
        </span>
      ),
    },
    {
      id: "units",
      header: t("columns.units"),
      sortKey: "units",
      align: "end",
      cell: (e) => (
        <Link
          href={`/inventory/experiments/${e.id}#units`}
          className="tabular-nums text-accent-text hover:underline"
        >
          {t("unitsInInventory", { inventory: e.stats.inventory, total: e.unitCount })}
        </Link>
      ),
    },
    {
      id: "team",
      header: t("columns.team"),
      cell: (e) =>
        e.members.length > 0
          ? e.members.map((m, index) => (
              <span key={m.id}>
                {index > 0 ? ", " : null}
                <EntityLink kind="member" id={m.id}>
                  {m.name}
                </EntityLink>
              </span>
            ))
          : domain("empty"),
    },
    {
      id: "parent",
      header: t("columns.parent"),
      cell: (e) =>
        e.parent ? (
          <EntityLink kind="experiment" id={e.parent.id} className="font-mono">
            {e.parent.ecode}
          </EntityLink>
        ) : (
          domain("empty")
        ),
    },
  ];

  const empty = filtered ? (
    <EmptyState
      icon={<FlaskConical />}
      title={t("noMatchTitle")}
      description={t("noMatchBody")}
      action={
        <Button href={BASE} variant="secondary">
          {t("clearFilters")}
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={<FlaskConical />}
      title={t("emptyTitle")}
      description={t("emptyBody")}
      action={
        <Button href="/inventory/experiments/new" variant="primary" icon={<Plus />}>
          {t("newExperiment")}
        </Button>
      }
    />
  );

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description", { count: total })}
        actions={
          <Button href="/inventory/experiments/new" variant="primary" icon={<Plus />}>
            {t("newExperiment")}
          </Button>
        }
      />

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
        controls={
          <>
            <SelectFilter
              label={t("sortLabel")}
              value={`${sort}:${list.order}`}
              options={sortOptions}
            />
            <ViewModeToggle basePath={BASE} params={current} activeView={view} />
          </>
        }
      >
        <FilterChips
          label={t("statusLabel")}
          clearHref={filtered ? BASE : undefined}
          chips={EXPERIMENT_LIST_STATUSES.map((key) => ({
            key,
            label: t(`statusOptions.${key}`),
            active: status === key,
            href: href({ status: status === key ? undefined : key }),
          }))}
        />
        <FilterChips
          label={t("membershipLabel")}
          chips={[
            {
              key: "mine",
              label: t("mine"),
              active: mine,
              href: href({ mine: mine ? undefined : "1" }),
            },
          ]}
        />
      </FilterBar>

      {view === "table" ? (
        <DataTable
          clientPaging={false}
          caption={t("caption")}
          captionHidden
          columns={columns}
          rows={rows}
          rowKey={(e) => e.id}
          sort={{ sort, order: list.order }}
          buildSortHref={(key, order) => href({ sort: key, order })}
          empty={empty}
        />
      ) : rows.length === 0 ? (
        <Panel>{empty}</Panel>
      ) : (
        <ul
          aria-label={t("caption")}
          className="grid list-none gap-4 p-0 sm:grid-cols-2 xl:grid-cols-3"
        >
          {rows.map((experiment) => (
            <li key={experiment.id}>
              <ExperimentCard experiment={experiment} />
            </li>
          ))}
        </ul>
      )}

      <Pagination
        className="mt-4"
        page={list.page}
        pageSize={list.limit}
        total={total}
        buildHref={(page) => buildListUrl(BASE, { ...current, limit: list.limit }, { page })}
      />
    </div>
  );
}
