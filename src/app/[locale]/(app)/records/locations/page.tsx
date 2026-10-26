export const dynamic = "force-dynamic";

import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { EntityLink, entityHref } from "@/components/page/EntityLink";
import { LocationOccupancy } from "@/components/LocationOccupancy";
import { LocationRowActions } from "@/components/LocationRowActions";
import { NewLocationButton } from "@/components/NewLocationButton";
import { FilterBar } from "@/components/page/FilterBar";
import { SearchForm } from "@/components/page/SearchForm";
import { StatCard } from "@/components/page/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import {
  getLocationOverview,
  listLocations,
  LOCATION_LIST_SORTS,
  LOCATION_LIST_STATUSES,
  type LocationListRow,
} from "@/features/location/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { isAdmin, requirePageUser } from "@/lib/auth";
import { buildListUrl, parseListParams, pickParam } from "@/lib/list-params";

const BASE = "/records/locations";

type SearchParams = Record<string, string | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("locations.list");
  return { title: t("pageTitle") };
}

export default async function LocationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const raw = await searchParams;
  const t = await getTranslations("locations");
  const format = await getFormatter();
  const canManage = isAdmin(user);

  const list = parseListParams(raw, { sort: "name", order: "asc" });
  const sort = pickParam(list.sort, LOCATION_LIST_SORTS) ?? "name";
  const status = pickParam(raw.status, LOCATION_LIST_STATUSES);

  const [{ rows, total }, overview] = await Promise.all([
    listLocations(user, {
      q: list.q,
      status,
      sort,
      order: list.order,
      page: list.page,
      limit: list.limit,
    }),
    getLocationOverview(user),
  ]);

  const current = { q: list.q, status, sort, order: list.order };
  const href = (overrides: Record<string, string | number | undefined | null>) =>
    buildListUrl(BASE, current, { page: undefined, ...overrides });
  const filtered = Boolean(list.q || status);

  const columns: Array<Column<LocationListRow>> = [
    {
      id: "name",
      header: t("list.columns.name"),
      sortKey: "name",
      rowHeader: true,
      cell: (l) => (
        <div className="min-w-0">
          <EntityLink kind="location" id={l.id}>
            {l.name}
          </EntityLink>
          {l.address ? (
            <p className="mt-0.5 text-sm font-normal text-fg-secondary">{l.address}</p>
          ) : null}
        </div>
      ),
    },
    {
      id: "status",
      header: t("list.columns.status"),
      cell: (l) => (
        <Badge
          tone={l.active ? "success" : "neutral"}
          href={buildListUrl(BASE, { status: l.active ? "active" : "retired" })}
        >
          {t(`status.${l.active ? "active" : "retired"}`)}
        </Badge>
      ),
    },
    {
      id: "units",
      header: t("list.columns.units"),
      sortKey: "units",
      align: "end",
      cell: (l) => (
        <EntityLink kind="location" id={l.id} className="tabular-nums">
          {format.number(l.units, "count")}
        </EntityLink>
      ),
    },
    {
      id: "capacity",
      header: t("list.columns.capacity"),
      sortKey: "capacity",
      align: "end",
      cell: (l) =>
        l.capacity === null ? (
          <span className="text-fg-secondary">{t("list.noLimit")}</span>
        ) : (
          <span className="tabular-nums">{format.number(l.capacity, "count")}</span>
        ),
    },
    {
      id: "occupancy",
      header: t("list.columns.occupancy"),
      cell: (l) => (
        <LocationOccupancy
          name={l.name}
          units={l.units}
          capacity={l.capacity}
          href={entityHref("location", l.id)}
        />
      ),
    },
    {
      id: "experiments",
      header: t("list.columns.experiments"),
      align: "end",
      cell: (l) => (
        <Link
          href="/inventory/experiments"
          className="text-accent-text tabular-nums hover:underline"
        >
          {format.number(l.experiments, "count")}
        </Link>
      ),
    },
    ...(canManage
      ? [
          {
            id: "actions",
            header: t("list.columns.actions"),
            hideHeader: true,
            align: "end" as const,
            cell: (l: LocationListRow) => (
              <LocationRowActions
                location={{
                  id: l.id,
                  name: l.name,
                  address: l.address,
                  comment: l.comment,
                  capacity: l.capacity,
                  active: l.active,
                  units: l.units,
                }}
              />
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader
        title={t("list.title")}
        description={t("list.description", { count: total })}
        actions={canManage ? <NewLocationButton /> : undefined}
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("stats.active")}
          value={format.number(overview.active, "count")}
          href={buildListUrl(BASE, { status: "active" })}
        />
        <StatCard
          label={t("stats.unitsStored")}
          value={format.number(overview.unitsStored, "count")}
          href="/inventory/units"
        />
        <StatCard
          label={t("stats.atCapacity")}
          value={format.number(overview.atCapacity, "count")}
          hint={t("stats.atCapacityHint")}
          tone={overview.atCapacity > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("stats.retired")}
          value={format.number(overview.retired, "count")}
          href={buildListUrl(BASE, { status: "retired" })}
        />
      </div>

      <FilterBar
        search={
          <SearchForm
            action={BASE}
            params={current}
            q={list.q}
            label={t("list.searchLabel")}
            placeholder={t("list.searchPlaceholder")}
          />
        }
      >
        <FilterChips
          label={t("list.statusLabel")}
          clearHref={filtered ? BASE : undefined}
          chips={LOCATION_LIST_STATUSES.map((key) => ({
            key,
            label: t(`status.${key}`),
            active: status === key,
            href: href({ status: status === key ? undefined : key }),
          }))}
        />
      </FilterBar>

      <DataTable
        caption={t("list.caption")}
        captionHidden
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        sort={{ sort, order: list.order }}
        buildSortHref={(key, order) => href({ sort: key, order })}
        empty={
          filtered ? (
            <EmptyState
              icon={<MapPin />}
              title={t("list.noMatchTitle")}
              description={t("list.noMatchBody")}
              action={
                <Button href={BASE} variant="secondary">
                  {t("list.clearFilters")}
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<MapPin />}
              title={t("list.emptyTitle")}
              description={canManage ? t("list.emptyBody") : t("list.emptyBodyMember")}
              action={canManage ? <NewLocationButton /> : undefined}
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
