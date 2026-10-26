export const dynamic = "force-dynamic";

import { Download, Search, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { RecallPrintButton } from "@/components/RecallPrintButton";
import { FilterBar } from "@/components/page/FilterBar";
import { SearchForm } from "@/components/page/SearchForm";
import { EntityLink } from "@/components/page/EntityLink";
import { StatCard } from "@/components/page/StatCard";
import {
  HoldBadge,
  ShipmentStatusBadge,
  UnitStatusBadge,
  UnitTypeBadge,
} from "@/components/page/domain-badges";
import { Banner } from "@/components/ui/Banner";
import { Badge } from "@/components/ui/Badge";
import { buttonStyles } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import {
  getRecallTrace,
  searchRecallUnits,
  type RecallNode,
  type RecallTrace,
} from "@/features/qa/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/lib/auth";
import { positiveIntParam } from "@/lib/list-params";

const BASE = "/quality/recall";
type SearchParams = Record<string, string | undefined>;

/** Indent per generation, written out in full so Tailwind generates every class. */
const INDENT = ["ps-0", "ps-4", "ps-8", "ps-12", "ps-16", "ps-20"] as const;
const indentFor = (generation: number | null) =>
  INDENT[Math.min(Math.abs(generation ?? 0), INDENT.length - 1)];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("recall.page");
  return { title: t("pageTitle") };
}

export default async function RecallPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const raw = await searchParams;
  const t = await getTranslations("recall.page");
  const locale = await getLocale();

  // `unitId` is the older link from a unit page; both mean the same thing.
  const unitId = positiveIntParam(raw.unit) ?? positiveIntParam(raw.unitId);
  const q = raw.q?.trim() || undefined;

  const trace = unitId ? await getRecallTrace(user, unitId) : null;
  const hits = !trace && q ? await searchRecallUnits(user, q) : [];

  return (
    <div>
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          trace ? (
            <div className="flex flex-wrap gap-2 print:hidden">
              <RecallPrintButton label={t("print")} />
              {/* A file download from the API, not a page of the app: a plain link, no language prefix. */}
              <a
                href={`/api/recall?unitId=${trace.origin.id}&format=csv&locale=${locale}`}
                className={buttonStyles({ variant: "secondary" })}
              >
                <Download aria-hidden="true" className="size-4" />
                {t("exportCsv")}
              </a>
            </div>
          ) : null
        }
      />

      <FilterBar
        search={
          <SearchForm
            action={BASE}
            params={{}}
            q={q ?? (trace ? trace.origin.name : undefined)}
            label={t("searchLabel")}
            placeholder={t("searchPlaceholder")}
          />
        }
      />

      {trace ? (
        <TraceView trace={trace} />
      ) : unitId ? (
        <EmptyState icon={<Search />} title={t("notFoundTitle")} description={t("notFoundBody")} />
      ) : q ? (
        <SearchResults hits={hits} q={q} />
      ) : (
        <EmptyState icon={<Undo2 />} title={t("startTitle")} description={t("startBody")} />
      )}
    </div>
  );
}

async function SearchResults({
  hits,
  q,
}: {
  hits: Awaited<ReturnType<typeof searchRecallUnits>>;
  q: string;
}) {
  const t = await getTranslations("recall.page");
  const domain = await getTranslations("domain");
  if (hits.length === 0) {
    return (
      <EmptyState
        icon={<Search />}
        title={t("noMatchTitle")}
        description={t("noMatchBody", { q })}
      />
    );
  }
  const columns: Array<Column<(typeof hits)[number]>> = [
    {
      id: "unit",
      header: t("results.unit"),
      rowHeader: true,
      cell: (h) => (
        <Link
          href={`/quality/recall?unit=${h.id}`}
          className="font-medium text-accent-text hover:underline"
        >
          {h.name}
        </Link>
      ),
    },
    { id: "type", header: t("results.type"), cell: (h) => <UnitTypeBadge type={h.type} /> },
    {
      id: "cultivar",
      header: t("results.cultivar"),
      cell: (h) =>
        h.cultivar ? (
          <EntityLink kind="cultivar" id={h.cultivarId} className="font-normal">
            {h.cultivar}
          </EntityLink>
        ) : (
          domain("empty")
        ),
    },
    {
      id: "status",
      header: t("results.status"),
      cell: (h) => <UnitStatusBadge status={h.standing} />,
    },
  ];
  return (
    <section aria-labelledby="results-heading" className="space-y-2">
      <h2 id="results-heading" className="text-base font-semibold text-fg">
        {t("results.title", { count: hits.length })}
      </h2>
      <DataTable
        caption={t("results.caption")}
        captionHidden
        columns={columns}
        rows={hits}
        rowKey={(h) => h.id}
      />
    </section>
  );
}

async function TraceView({ trace }: { trace: RecallTrace }) {
  const t = await getTranslations("recall.page");
  const domain = await getTranslations("domain");
  const format = await getFormatter();
  const { origin, counts } = trace;
  const empty = domain("empty");

  const lineage = [...trace.upstream, origin, ...trace.downstream];
  const shipmentById = new Map(trace.shipments.map((s) => [s.id, s]));

  const custody = (n: RecallNode) =>
    n.standing === "destroyed" ? (
      t("custody.destroyed")
    ) : n.standing === "shipped" ? (
      n.shippedTo ? (
        <>
          {t("custody.shippedTo")}{" "}
          <Link href={`/records/organizations/${n.shippedTo.id}`} className="hover:underline">
            {n.shippedTo.name}
          </Link>
        </>
      ) : (
        t("custody.shipped")
      )
    ) : n.locationName ? (
      <EntityLink kind="location" id={n.locationId} className="font-normal">
        {t("custody.at", { location: n.locationName })}
      </EntityLink>
    ) : (
      empty
    );

  const holdCell = (n: RecallNode) =>
    n.hold && n.standing !== "shipped" && n.standing !== "destroyed" ? (
      <>
        <HoldBadge kind={n.hold.kind} />
        <span className="block text-fg-secondary">{n.hold.reason}</span>
      </>
    ) : (
      empty
    );

  const unitColumn: Column<RecallNode> = {
    id: "unit",
    header: t("lineage.unit"),
    rowHeader: true,
    cell: (n) => (
      <span className={`block ${indentFor(n.generation)}`}>
        <Link
          href={n.relation === "self" ? `/inventory/units/${n.id}` : `/quality/recall?unit=${n.id}`}
          className="font-medium text-accent-text hover:underline"
        >
          {n.name}
        </Link>
        <span className="block text-fg-secondary">
          {n.relation === "self"
            ? t("relation.self")
            : n.generation === null
              ? t("relation.same-cultivar")
              : t(
                  n.generation < 0 ? "lineage.upstreamGeneration" : "lineage.downstreamGeneration",
                  {
                    generation: Math.abs(n.generation),
                  }
                )}
        </span>
      </span>
    ),
  };
  const columns: Array<Column<RecallNode>> = [
    unitColumn,
    { id: "type", header: t("lineage.type"), cell: (n) => <UnitTypeBadge type={n.type} /> },
    {
      id: "status",
      header: t("lineage.status"),
      cell: (n) => <UnitStatusBadge status={n.standing} />,
    },
    { id: "hold", header: t("lineage.hold"), cell: holdCell },
    { id: "custody", header: t("lineage.custody"), cell: custody },
    {
      id: "origin",
      header: t("lineage.source"),
      cell: (n) => (
        <>
          {n.cultivar ? (
            <EntityLink kind="cultivar" id={n.cultivarId} className="font-normal">
              {n.cultivar}
            </EntityLink>
          ) : (
            empty
          )}
          {n.experiment ? (
            <EntityLink kind="experiment" id={n.experiment.id} className="block font-normal">
              {n.experiment.ecode}
            </EntityLink>
          ) : null}
        </>
      ),
    },
    {
      id: "shipments",
      header: t("lineage.shipments"),
      cell: (n) =>
        n.shipmentIds.length === 0 ? (
          empty
        ) : (
          <span className="flex flex-col gap-0.5">
            {n.shipmentIds.map((id) => (
              <Link key={id} href={`/inventory/materials/${id}`} className="hover:underline">
                {shipmentById.get(id)?.reference ?? id}
              </Link>
            ))}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <Panel>
        <PanelBody>
          <p className="text-sm text-fg-secondary">{t("origin.label")}</p>
          <p className="mt-1 flex flex-wrap items-center gap-3">
            <Link
              href={`/inventory/units/${origin.id}`}
              className="text-2xl font-semibold text-accent-text hover:underline"
            >
              {origin.name}
            </Link>
            <UnitTypeBadge type={origin.type} />
            <UnitStatusBadge status={origin.standing} />
          </p>
          <p className="mt-2 text-sm text-fg-secondary">
            {origin.cultivar || origin.experiment ? (
              <>
                {origin.cultivar ? (
                  <EntityLink kind="cultivar" id={origin.cultivarId} className="font-normal">
                    {origin.cultivar}
                  </EntityLink>
                ) : null}
                {origin.cultivar && origin.experiment ? " · " : null}
                {origin.experiment ? (
                  <EntityLink kind="experiment" id={origin.experiment.id} className="font-normal">
                    {origin.experiment.ecode}
                  </EntityLink>
                ) : null}
              </>
            ) : (
              empty
            )}
            {" · "}
            {custody(origin)}
          </p>
          {origin.hold ? (
            <Banner tone="warning" title={t("origin.heldTitle")} className="mt-4">
              {t("origin.heldBody", {
                origin: domain(`holdOrigin.${origin.hold.origin}`),
                reason: origin.hold.reason,
                date: format.dateTime(origin.hold.placedAt, "dateTime"),
              })}
            </Banner>
          ) : null}
        </PanelBody>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("counts.upstream")} value={format.number(counts.upstream, "count")} />
        <StatCard
          label={t("counts.downstream")}
          value={format.number(counts.downstream, "count")}
        />
        <StatCard
          label={t("counts.inInventory")}
          value={format.number(counts.inInventory, "count")}
        />
        <StatCard
          label={t("counts.onHold")}
          value={format.number(counts.onHold, "count")}
          href="/quality?view=holds"
          tone={counts.onHold > 0 ? "warning" : "default"}
        />
        <StatCard
          label={t("counts.shipped")}
          value={format.number(counts.shipped, "count")}
          href="/inventory/units?status=shipped"
        />
        <StatCard
          label={t("counts.organizations")}
          value={format.number(counts.organizations, "count")}
          hint={t("counts.shipmentsHint", { count: counts.shipments })}
          href="/records/organizations"
        />
      </div>

      {trace.truncated ? (
        <Banner tone="warning" title={t("truncatedTitle")}>
          {t("truncatedBody", { count: counts.downstream })}
        </Banner>
      ) : null}

      <section aria-labelledby="lineage-heading" className="space-y-2">
        <h2 id="lineage-heading" className="text-lg font-semibold text-fg">
          {t("lineage.title")}
        </h2>
        <p className="text-sm text-fg-secondary">{t("lineage.hint")}</p>
        <DataTable
          caption={t("lineage.caption", { name: origin.name })}
          captionHidden
          columns={columns}
          rows={lineage}
          rowKey={(n) => n.id}
          density="compact"
        />
      </section>

      <section aria-labelledby="orgs-heading" className="space-y-2">
        <h2 id="orgs-heading" className="text-lg font-semibold text-fg">
          {t("organizations.title")}
        </h2>
        <DataTable
          caption={t("organizations.caption")}
          captionHidden
          columns={[
            {
              id: "name",
              header: t("organizations.name"),
              rowHeader: true,
              cell: (o) => (
                <Link
                  href={`/records/organizations/${o.id}`}
                  className="font-medium text-accent-text hover:underline"
                >
                  {o.name}
                </Link>
              ),
            },
            {
              id: "licence",
              header: t("organizations.licence"),
              cell: (o) => o.licenceNumber ?? empty,
            },
            {
              id: "units",
              header: t("organizations.units"),
              align: "end",
              cell: (o) => format.number(o.unitCount, "count"),
            },
            {
              id: "shipments",
              header: t("organizations.shipments"),
              cell: (o) => (
                <span className="flex flex-wrap gap-x-3">
                  {o.shipmentIds.map((id) => (
                    <Link key={id} href={`/inventory/materials/${id}`} className="hover:underline">
                      {shipmentById.get(id)?.reference ?? id}
                    </Link>
                  ))}
                </span>
              ),
            },
          ]}
          rows={trace.organizations}
          rowKey={(o) => o.id}
          empty={<span className="text-fg-secondary">{t("organizations.none")}</span>}
        />
      </section>

      <section aria-labelledby="shipments-heading" className="space-y-2">
        <h2 id="shipments-heading" className="text-lg font-semibold text-fg">
          {t("shipments.title")}
        </h2>
        <DataTable
          caption={t("shipments.caption")}
          captionHidden
          columns={[
            {
              id: "reference",
              header: t("shipments.reference"),
              rowHeader: true,
              cell: (s) => (
                <Link
                  href={`/inventory/materials/${s.id}`}
                  className="font-medium text-accent-text hover:underline"
                >
                  {s.reference}
                </Link>
              ),
            },
            {
              id: "direction",
              header: t("shipments.direction"),
              cell: (s) => <Badge>{domain(`shipmentDirection.${s.direction}`)}</Badge>,
            },
            {
              id: "status",
              header: t("shipments.status"),
              cell: (s) => <ShipmentStatusBadge status={s.status} />,
            },
            {
              id: "org",
              header: t("shipments.organization"),
              cell: (s) => (
                <EntityLink kind="organization" id={s.organization.id} className="font-normal">
                  {s.organization.name}
                </EntityLink>
              ),
            },
            {
              id: "units",
              header: t("shipments.units"),
              cell: (s) => (
                <span className="flex flex-wrap gap-x-3">
                  {s.units.map((unit) => (
                    <EntityLink key={unit.id} kind="unit" id={unit.id} className="font-normal">
                      {unit.name}
                    </EntityLink>
                  ))}
                </span>
              ),
            },
          ]}
          rows={trace.shipments}
          rowKey={(s) => s.id}
          empty={<span className="text-fg-secondary">{t("shipments.none")}</span>}
        />
      </section>

      {trace.sameCultivar.length > 0 ? (
        <Panel className="print:hidden">
          <PanelHeader
            title={t("peers.title", { count: trace.sameCultivarTotal })}
            description={t("peers.hint", { cultivar: origin.cultivar ?? empty })}
          />
          <PanelBody>
            <DataTable
              caption={t("peers.caption")}
              captionHidden
              density="compact"
              columns={[
                {
                  id: "unit",
                  header: t("lineage.unit"),
                  rowHeader: true,
                  cell: (n) => (
                    <Link
                      href={`/quality/recall?unit=${n.id}`}
                      className="font-medium text-accent-text hover:underline"
                    >
                      {n.name}
                    </Link>
                  ),
                },
                {
                  id: "type",
                  header: t("lineage.type"),
                  cell: (n) => <UnitTypeBadge type={n.type} />,
                },
                { id: "hold", header: t("lineage.hold"), cell: holdCell },
                { id: "custody", header: t("lineage.custody"), cell: custody },
              ]}
              rows={trace.sameCultivar}
              rowKey={(n) => n.id}
            />
            {trace.sameCultivarTotal > trace.sameCultivar.length ? (
              <p className="mt-2 text-sm text-fg-secondary">
                {t("peers.more", {
                  shown: trace.sameCultivar.length,
                  total: trace.sameCultivarTotal,
                })}
              </p>
            ) : null}
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}
