export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { OrganizationEditButton } from "@/components/OrganizationEditButton";
import { OrganizationRelations } from "@/components/OrganizationRelations";
import { StatCard } from "@/components/page/StatCard";
import { HubCrumbs } from "@/components/shell/HubCrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { getOrganizationDetail, ORGANIZATION_SECTION_SIZE } from "@/features/organization/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { isAdmin, requirePageUser } from "@/lib/auth";
import { buildListUrl, positiveIntParam } from "@/lib/list-params";
import { ActivityPanel } from "./_components/ActivityPanel";
import { MaterialTotalsPanel } from "./_components/MaterialTotalsPanel";
import { ProfilePanel } from "./_components/ProfilePanel";
import { ShipmentsPanel } from "./_components/ShipmentsPanel";
import { SuppliedUnitsPanel } from "./_components/SuppliedUnitsPanel";
import { TestsPanel } from "./_components/TestsPanel";

type SearchParams = Record<string, string | undefined>;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const t = await getTranslations("organizations.detail");
  const { id } = await params;
  return { title: t("pageTitle", { id }) };
}

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const { id: rawId } = await params;
  const raw = await searchParams;
  const id = positiveIntParam(rawId);
  if (!id) notFound();

  const pages = {
    inbound: positiveIntParam(raw.inPage) ?? 1,
    outbound: positiveIntParam(raw.outPage) ?? 1,
    units: positiveIntParam(raw.unitsPage) ?? 1,
    tests: positiveIntParam(raw.testsPage) ?? 1,
  };
  const detail = await getOrganizationDetail(user, id, pages);
  if (!detail) notFound();

  const t = await getTranslations("organizations.detail");
  const format = await getFormatter();
  const { organization, counts } = detail;

  // Each table pages on its own parameter, so moving one never resets another.
  const path = `/records/organizations/${id}`;
  const state = {
    inPage: pages.inbound,
    outPage: pages.outbound,
    unitsPage: pages.units,
    testsPage: pages.tests,
  };
  const pageHref = (key: keyof typeof state) => (page: number) =>
    buildListUrl(path, state, { [key]: page });

  const subtitle = [
    organization.country,
    organization.licenceNumber ? t("licenceLine", { licence: organization.licenceNumber }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<HubCrumbs tab="organizations" current={organization.name} />}
        title={organization.name}
        description={subtitle || t("noDetails")}
        actions={isAdmin(user) ? <OrganizationEditButton organization={organization} /> : undefined}
        className="pb-0"
      />

      <OrganizationRelations relations={detail.relations} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("stats.unitsSupplied")}
          value={format.number(counts.suppliedUnits, "count")}
          href="#org-units"
        />
        <StatCard
          label={t("stats.unitsReceived")}
          value={format.number(counts.unitsReceived, "count")}
          href={buildListUrl("/inventory/materials", { organization: id, direction: "INBOUND" })}
        />
        <StatCard
          label={t("stats.unitsShipped")}
          value={format.number(counts.unitsShipped, "count")}
          href={buildListUrl("/inventory/materials", { organization: id, direction: "OUTBOUND" })}
        />
        <StatCard
          label={t("stats.shipments")}
          value={format.number(counts.shipments, "count")}
          href={buildListUrl("/inventory/materials", { organization: id })}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ProfilePanel
          address={organization.address}
          country={organization.country}
          licenceNumber={organization.licenceNumber}
          comment={organization.comment}
        />
        <MaterialTotalsPanel
          title={t("totals.receivedTitle")}
          description={t("totals.description")}
          totals={detail.inboundTotals}
          href={buildListUrl("/inventory/materials", { organization: id, direction: "INBOUND" })}
        />
        <MaterialTotalsPanel
          title={t("totals.sentTitle")}
          description={t("totals.description")}
          totals={detail.outboundTotals}
          href={buildListUrl("/inventory/materials", { organization: id, direction: "OUTBOUND" })}
        />
      </div>

      <ShipmentsPanel
        headingId="org-inbound"
        title={t("shipments.inboundTitle")}
        emptyTitle={t("shipments.inboundEmptyTitle")}
        emptyBody={t("shipments.inboundEmptyBody")}
        rows={detail.inbound.rows}
        total={detail.inbound.total}
        page={pages.inbound}
        pageSize={ORGANIZATION_SECTION_SIZE}
        buildHref={pageHref("inPage")}
      />
      <ShipmentsPanel
        headingId="org-outbound"
        title={t("shipments.outboundTitle")}
        emptyTitle={t("shipments.outboundEmptyTitle")}
        emptyBody={t("shipments.outboundEmptyBody")}
        rows={detail.outbound.rows}
        total={detail.outbound.total}
        page={pages.outbound}
        pageSize={ORGANIZATION_SECTION_SIZE}
        buildHref={pageHref("outPage")}
      />
      <SuppliedUnitsPanel
        rows={detail.units.rows}
        total={detail.units.total}
        page={pages.units}
        pageSize={ORGANIZATION_SECTION_SIZE}
        buildHref={pageHref("unitsPage")}
      />
      <TestsPanel
        rows={detail.tests.rows}
        total={detail.tests.total}
        page={pages.tests}
        pageSize={ORGANIZATION_SECTION_SIZE}
        buildHref={pageHref("testsPage")}
      />
      <ActivityPanel entries={detail.activity} />
    </div>
  );
}
