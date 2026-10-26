export const dynamic = "force-dynamic";

import { ArrowDownLeft, ArrowUpRight, Plus, Truck } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { MaterialTotalsText } from "@/components/MaterialFigures";
import { FilterBar } from "@/components/page/FilterBar";
import { RegisterSearchForm } from "@/components/RegisterSearchForm";
import { EntityLink } from "@/components/page/EntityLink";
import { SelectFilter } from "@/components/page/SelectFilter";
import { StatCard } from "@/components/page/StatCard";
import { ShipmentStatusBadge } from "@/components/page/domain-badges";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterChips } from "@/components/ui/FilterChips";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pagination } from "@/components/ui/Pagination";
import {
  getShipmentFormOptions,
  getShipmentStats,
  listShipments,
  SHIPMENT_LIST_DIRECTIONS,
  SHIPMENT_LIST_SORTS,
  SHIPMENT_LIST_STATUSES,
  type ShipmentListRow,
} from "@/features/shipment/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { isAdmin, requirePageUser } from "@/lib/auth";
import { dayParam, orderedRange } from "@/lib/date-filter";
import { buildListUrl, parseListParams, pickParam, positiveIntParam } from "@/lib/list-params";

const BASE = "/inventory/materials";

type SearchParams = Record<string, string | undefined>;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("materials.list");
  return { title: t("pageTitle") };
}

export default async function MaterialsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const raw = await searchParams;
  const t = await getTranslations("materials.list");
  const domain = await getTranslations("domain");
  const format = await getFormatter();

  const list = parseListParams(raw, { sort: "date", order: "desc" });
  const sort = pickParam(list.sort, SHIPMENT_LIST_SORTS) ?? "date";
  const direction = pickParam(raw.direction, SHIPMENT_LIST_DIRECTIONS);
  const status = pickParam(raw.status, SHIPMENT_LIST_STATUSES);
  const organizationId = positiveIntParam(raw.organization);
  const { from, to } = orderedRange(dayParam(raw.from), dayParam(raw.to));

  const filters = { q: list.q, direction, status, organizationId, from, to };
  const [{ rows, total }, stats, options] = await Promise.all([
    listShipments(user, {
      ...filters,
      sort,
      order: list.order,
      page: list.page,
      limit: list.limit,
    }),
    getShipmentStats(user, filters),
    getShipmentFormOptions(),
  ]);

  const current = {
    q: list.q,
    direction,
    status,
    organization: organizationId,
    from,
    to,
    sort,
    order: list.order,
  };
  const href = (overrides: Record<string, string | number | undefined | null>) =>
    buildListUrl(BASE, current, { page: undefined, ...overrides });
  const filtered = Boolean(list.q || direction || status || organizationId || from || to);
  const admin = isAdmin(user);

  const columns: Array<Column<ShipmentListRow>> = [
    {
      id: "reference",
      header: t("columns.reference"),
      sortKey: "reference",
      rowHeader: true,
      cell: (s) => (
        <EntityLink kind="shipment" id={s.id}>
          {s.reference}
        </EntityLink>
      ),
    },
    {
      id: "direction",
      header: t("columns.direction"),
      sortKey: "direction",
      cell: (s) => (
        <Badge
          tone={s.direction === "INBOUND" ? "info" : "accent"}
          icon={s.direction === "INBOUND" ? <ArrowDownLeft /> : <ArrowUpRight />}
          href={`${BASE}?direction=${s.direction}`}
        >
          {domain(`shipmentDirection.${s.direction}`)}
        </Badge>
      ),
    },
    {
      id: "organization",
      header: t("columns.organization"),
      sortKey: "organization",
      cell: (s) => (
        <EntityLink kind="organization" id={s.organization.id}>
          {s.organization.name}
        </EntityLink>
      ),
    },
    {
      id: "date",
      header: t("columns.date"),
      sortKey: "date",
      cell: (s) => (
        <time dateTime={s.movementDate.toISOString()}>
          {format.dateTime(s.movementDate, "date")}
        </time>
      ),
    },
    {
      id: "material",
      header: t("columns.material"),
      cell: (s) => (
        <>
          <MaterialTotalsText totals={s.totals} />
          <span className="block text-fg-secondary">{t("lines", { count: s.lineCount })}</span>
        </>
      ),
    },
    {
      id: "tracking",
      header: t("columns.tracking"),
      cell: (s) => (
        <>
          {s.trackingNumber ?? domain("empty")}
          {s.manifestNumber ? (
            <span className="block text-fg-secondary">
              {t("manifestNumber", { number: s.manifestNumber })}
            </span>
          ) : null}
        </>
      ),
    },
    {
      id: "status",
      header: t("columns.status"),
      sortKey: "status",
      cell: (s) => <ShipmentStatusBadge status={s.status} />,
    },
  ];

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description", { count: total })}
        actions={
          admin ? (
            <Button href="/inventory/materials/new" variant="primary" icon={<Plus />}>
              {t("newMovement")}
            </Button>
          ) : null
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("stats.received")}
          value={format.number(stats.received.count, "count")}
          hint={<MaterialTotalsText totals={stats.received.totals} />}
          href={href({ direction: "INBOUND", status: "DELIVERED" })}
        />
        <StatCard
          label={t("stats.shipped")}
          value={format.number(stats.shipped.count, "count")}
          hint={<MaterialTotalsText totals={stats.shipped.totals} />}
          href={href({ direction: "OUTBOUND", status: undefined })}
        />
        <StatCard
          label={t("stats.inTransit")}
          value={format.number(stats.inTransit, "count")}
          hint={t("stats.inTransitHint")}
          href={href({ direction: undefined, status: "IN_TRANSIT" })}
          tone={stats.inTransit > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("stats.drafts")}
          value={format.number(stats.drafts, "count")}
          hint={t("stats.draftsHint")}
          href={href({ direction: undefined, status: "DRAFT" })}
        />
      </div>

      <FilterBar
        search={
          <RegisterSearchForm
            action={BASE}
            params={current}
            q={list.q}
            from={from}
            to={to}
            label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
            fromLabel={t("dateFrom")}
            toLabel={t("dateTo")}
          />
        }
        controls={
          <SelectFilter
            label={t("organizationLabel")}
            value={organizationId ? String(organizationId) : "all"}
            options={[
              {
                value: "all",
                label: t("allOrganizations"),
                href: href({ organization: undefined }),
              },
              ...options.organizations.map((org) => ({
                value: String(org.id),
                label: org.name,
                href: href({ organization: org.id }),
              })),
            ]}
          />
        }
      >
        <FilterChips
          label={t("directionLabel")}
          clearHref={filtered ? BASE : undefined}
          chips={SHIPMENT_LIST_DIRECTIONS.map((key) => ({
            key,
            label: domain(`shipmentDirection.${key}`),
            active: direction === key,
            href: href({ direction: direction === key ? undefined : key }),
          }))}
        />
        <FilterChips
          label={t("statusLabel")}
          chips={SHIPMENT_LIST_STATUSES.map((key) => ({
            key,
            label: domain(`shipmentStatus.${key}`),
            active: status === key,
            href: href({ status: status === key ? undefined : key }),
          }))}
        />
      </FilterBar>

      <DataTable
        clientPaging={false}
        caption={t("caption")}
        captionHidden
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        sort={{ sort, order: list.order }}
        buildSortHref={(key, order) => href({ sort: key, order })}
        empty={
          filtered ? (
            <EmptyState
              icon={<Truck />}
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
              icon={<Truck />}
              title={t("emptyTitle")}
              description={t("emptyBody")}
              action={
                admin ? (
                  <Button href="/inventory/materials/new" variant="primary">
                    {t("emptyAction")}
                  </Button>
                ) : undefined
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
