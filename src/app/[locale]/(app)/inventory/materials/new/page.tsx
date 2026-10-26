export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ShipmentForm } from "@/components/ShipmentForm";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { HubCrumbs } from "@/components/shell/HubCrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { getShipmentFormOptions } from "@/features/shipment/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { isAdmin, requirePageUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("materials.form");
  return { title: t("pageTitle") };
}

export default async function NewMaterialMovementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const t = await getTranslations("materials.form");

  if (!isAdmin(user)) {
    return (
      <div>
        <PageHeader
          breadcrumbs={<HubCrumbs tab="materials" kind="new" />}
          title={t("title")}
          description={t("description")}
        />
        <EmptyState
          title={t("lockedTitle")}
          description={t("lockedBody")}
          action={
            <Button href="/inventory/materials" variant="secondary">
              {t("lockedAction")}
            </Button>
          }
        />
      </div>
    );
  }

  const options = await getShipmentFormOptions();
  return (
    <div className="max-w-5xl">
      <PageHeader
        breadcrumbs={<HubCrumbs tab="materials" kind="new" />}
        title={t("title")}
        description={t("description")}
      />
      <ShipmentForm organizations={options.organizations} cultivars={options.cultivars} />
    </div>
  );
}
