export const dynamic = "force-dynamic";

import { Boxes } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { FilterBar } from "@/components/page/FilterBar";
import { SearchForm } from "@/components/page/SearchForm";
import { EntityLink } from "@/components/page/EntityLink";
import { SelectFilter } from "@/components/page/SelectFilter";
import { UnitStatusBadge, UnitTypeBadge } from "@/components/page/domain-badges";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import {
  listLocationOptions,
  listUnits,
  UNIT_LIST_SORTS,
  UNIT_LIST_STAGES,
  UNIT_LIST_STATUSES,
  type UnitListRow,
} from "@/features/unit/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/lib/auth";
import { buildListUrl, parseListParams, pickParam, positiveIntParam } from "@/lib/list-params";

const BASE = "/inventory/units";
const TYPES = ["PLANT", "SEEDLOT", "FLOWER", "CULTURE"] as const;

type SearchParams = Record<string, string | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("units.list");
  return { title: t("pageTitle") };
}

export default async function UnitsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const raw = await searchParams;
  const t = await getTranslations("units.list");
  const domain = await getTranslations("domain");
  const format = await getFormatter();

  const list = parseListParams(raw, { sort: "date", order: "desc" });
  const sort = pickParam(list.sort, UNIT_LIST_SORTS) ?? "date";
  const status = pickParam(raw.status, UNIT_LIST_STATUSES);
  const type = pickParam(raw.type, TYPES);
  const stage = pickParam(raw.stage, UNIT_LIST_STAGES);
  const locationId = positiveIntParam(raw.location);

  const [{ rows, total }, locations] = await Promise.all([
    listUnits(user, {
      q: list.q,
      type,
      status,
      locationId,
      stage,
      sort,
      order: list.order,
      page: list.page,
      limit: list.limit,
    }),
    listLocationOptions(locationId),
  ]);

  const current = {
    q: list.q,
    status,
    type,
    stage,
    location: locationId,
    sort,
    order: list.order,
  };
  const href = (overrides: Record<string, string | number | undefined | null>) =>
    buildListUrl(BASE, current, { page: undefined, ...overrides });
  const filtered = Boolean(list.q || status || type || stage || locationId);

  const columns: Array<Column<UnitListRow>> = [
    {
      id: "name",
      header: t("columns.name"),
      sortKey: "name",
      rowHeader: true,
      cell: (u) => (
        <Link
          href={`/inventory/units/${u.id}`}
          className="font-medium text-accent-text hover:underline"
        >
          {u.name}
        </Link>
      ),
    },
    {
      id: "type",
      header: t("columns.type"),
      sortKey: "type",
      cell: (u) => <UnitTypeBadge type={u.type} />,
    },
    {
      id: "cultivar",
      header: t("columns.cultivar"),
      sortKey: "cultivar",
      cell: (u) => (
        <EntityLink kind="cultivar" id={u.cultivarId}>
          {u.cultivarName ?? domain("empty")}
        </EntityLink>
      ),
    },
    {
      id: "experiment",
      header: t("columns.experiment"),
      cell: (u) =>
        u.experiment ? (
          <EntityLink kind="experiment" id={u.experiment.id}>
            {u.experiment.ecode}
          </EntityLink>
        ) : (
          domain("empty")
        ),
    },
    {
      id: "location",
      header: t("columns.location"),
      sortKey: "location",
      cell: (u) => (
        <EntityLink kind="location" id={u.locationId}>
          {u.locationName ?? domain("empty")}
        </EntityLink>
      ),
    },
    {
      id: "updated",
      header: t("columns.updated"),
      sortKey: "date",
      cell: (u) => (
        <time dateTime={u.lastUpdated.toISOString()}>
          {format.dateTime(u.lastUpdated, "dateTime")}
        </time>
      ),
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: (u) => <UnitStatusBadge status={u.status} />,
    },
  ];

  return (
    <div>
      <PageHeader title={t("title")} description={t("description", { count: total })} />

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
          <SelectFilter
            label={t("locationLabel")}
            value={locationId ? String(locationId) : "all"}
            options={[
              { value: "all", label: t("allLocations"), href: href({ location: undefined }) },
              ...locations.map((l) => ({
                value: String(l.id),
                label: l.name,
                href: href({ location: l.id }),
              })),
            ]}
          />
        }
      >
        <FilterChips
          label={t("statusLabel")}
          clearHref={filtered ? BASE : undefined}
          chips={UNIT_LIST_STATUSES.map((key) => ({
            key,
            label: t(`statusOptions.${key}`),
            active: status === key,
            href: href({ status: status === key ? undefined : key }),
          }))}
        />
        <FilterChips
          label={t("stageLabel")}
          chips={UNIT_LIST_STAGES.map((key) => ({
            key,
            label: domain(`growthStage.${key}`),
            active: stage === key,
            href: href({ stage: stage === key ? undefined : key }),
          }))}
        />
        <FilterChips
          label={t("typeLabel")}
          chips={TYPES.map((key) => ({
            key,
            label: domain(`unitTypePlural.${key}`),
            active: type === key,
            href: href({ type: type === key ? undefined : key }),
          }))}
        />
      </FilterBar>

      <DataTable
        clientPaging={false}
        caption={t("caption")}
        captionHidden
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        sort={{ sort, order: list.order }}
        buildSortHref={(key, order) => href({ sort: key, order })}
        empty={
          filtered ? (
            <EmptyState
              icon={<Boxes />}
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
              icon={<Boxes />}
              title={t("emptyTitle")}
              description={t("emptyBody")}
              action={
                <Button href="/inventory/experiments" variant="primary">
                  {t("emptyAction")}
                </Button>
              }
            />
          )
        }
      />
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
