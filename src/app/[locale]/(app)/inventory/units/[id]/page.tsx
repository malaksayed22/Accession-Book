export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { HubCrumbs } from "@/components/shell/HubCrumbs";
import { UnitProfileView } from "@/components/UnitProfileView";
import type { UnitTabId } from "@/components/unit/UnitTabs";
import {
  getUnitDocuments,
  getUnitLedger,
  getUnitProfile,
  getUnitQuality,
  listLocationOptions,
  listWitnessOptions,
} from "@/features/unit/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { requirePageUser } from "@/lib/auth";
import { pickParam } from "@/lib/list-params";
import { getUnitProfileUrl } from "@/lib/unit-codes";
import { env } from "@/server/env";

const TABS = [
  "overview",
  "history",
  "lineage",
  "quality",
  "documents",
] as const satisfies readonly UnitTabId[];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("units.detail");
  return { title: t("pageTitle") };
}

export default async function UnitDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const { id } = await params;
  const raw = await searchParams;

  const unitId = Number(id);
  if (!Number.isInteger(unitId) || unitId <= 0) notFound();

  const profile = await getUnitProfile(user, unitId);
  if (!profile) notFound();

  const canEdit = profile.access.canEdit && profile.terminal === null;
  const [ledger, quality, documents, locations, witnesses] = await Promise.all([
    getUnitLedger(user, unitId),
    getUnitQuality(user, unitId),
    getUnitDocuments(user, unitId),
    canEdit ? listLocationOptions() : Promise.resolve([]),
    canEdit ? listWitnessOptions(user) : Promise.resolve([]),
  ]);

  return (
    <UnitProfileView
      profile={profile}
      ledger={ledger}
      quality={quality}
      documents={documents}
      locations={locations}
      witnesses={witnesses}
      profileUrl={getUnitProfileUrl(env().APP_URL, unitId)}
      viewerId={user.id}
      tab={pickParam(raw.tab, TABS) ?? "overview"}
      breadcrumbs={<HubCrumbs tab="units" current={profile.name} />}
    />
  );
}
