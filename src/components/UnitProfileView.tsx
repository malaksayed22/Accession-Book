import { FileText, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { EntityLink } from "@/components/page/EntityLink";
import { richValue } from "@/components/page/rich-value";
import { HoldBadge, UnitStatusBadge, UnitTypeBadge } from "@/components/page/domain-badges";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { UnitHierarchyPanel } from "@/components/UnitHierarchyPanel";
import { UnitQaPanels } from "@/components/UnitQaPanels";
import { UnitExtrasPanels } from "@/components/UnitExtrasPanels";
import { LedgerList } from "@/components/unit/LedgerList";
import { ActionButton, ActionsMenu, UnitActionsProvider } from "@/components/unit/UnitActions";
import { UnitOverview } from "@/components/unit/UnitOverview";
import { UnitTabs, type UnitTabId } from "@/components/unit/UnitTabs";
import type { ActionUnit, Option } from "@/components/unit/action-types";
import { When } from "@/components/unit/common";
import type { UnitDocuments, UnitProfile, UnitQuality } from "@/features/unit/queries";
import type { LedgerEvent } from "@/lib/ledger-types";
import { availabilityMap } from "@/lib/unit-actions";

/**
 * The unit as a record: who and what it is, whether anything stops it moving, and tabs for its
 * history, lineage, quality and documents. Everything shown is read on the server; the action menu
 * and the forms behind it are the only client code, and the server re-checks every request.
 */
export function UnitProfileView({
  profile,
  ledger,
  quality,
  documents,
  locations,
  witnesses,
  profileUrl,
  viewerId,
  tab,
  breadcrumbs,
}: {
  profile: UnitProfile;
  ledger: LedgerEvent[];
  quality: UnitQuality;
  documents: UnitDocuments;
  /** Active locations, for the move and derive forms (empty when the user cannot edit). */
  locations: Option[];
  /** Possible witnesses for a destruction (empty when the user cannot edit). */
  witnesses: Option[];
  profileUrl: string;
  viewerId: number;
  tab: UnitTabId;
  /** Trail above the title; built on the server, so it is passed in. */
  breadcrumbs?: ReactNode;
}) {
  const t = useTranslations("units.detail");
  const domain = useTranslations("domain");

  const availability = availabilityMap({
    type: profile.type,
    terminal: profile.terminal,
    onHold: profile.hold !== null,
    hasParent: profile.parent !== null,
    canEdit: profile.access.canEdit,
    isAdmin: profile.access.isAdmin,
  });
  const unit: ActionUnit = {
    id: profile.id,
    name: profile.name,
    type: profile.type,
    locationId: profile.current?.locationId ?? null,
    growthStage: profile.current?.growthStage ?? null,
    humidWeight: profile.weights.humid,
    dryWeight: profile.weights.dry,
    seedCount: profile.current?.seedCount ?? null,
    sex: profile.sex,
    notes: profile.notes,
    terminal: profile.terminal,
  };

  const subtitle = (
    <>
      {domain(`unitType.${profile.type}`)}
      {profile.cultivar ? (
        <>
          {" · "}
          <EntityLink kind="cultivar" id={profile.cultivar.id}>
            {profile.cultivar.name}
          </EntityLink>
        </>
      ) : null}
      {profile.experiment ? (
        <>
          {" · "}
          <EntityLink kind="experiment" id={profile.experiment.id}>
            {profile.experiment.ecode}
          </EntityLink>
        </>
      ) : null}
    </>
  );

  return (
    <UnitActionsProvider
      unit={unit}
      availability={availability}
      locations={locations}
      witnesses={witnesses}
    >
      <PageHeader
        breadcrumbs={breadcrumbs}
        className="pb-3"
        title={profile.name}
        description={subtitle}
        actions={
          <>
            <ActionsMenu />
            <Button
              href={`/quality/recall?unitId=${profile.id}`}
              variant="secondary"
              icon={<ShieldAlert />}
            >
              {t("recallTrace")}
            </Button>
            <Button
              href={`/inventory/units/${profile.id}/export`}
              variant="secondary"
              icon={<FileText />}
              target="_blank"
            >
              {t("auditReport")}
            </Button>
          </>
        }
      />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <UnitTypeBadge type={profile.type} />
        <UnitStatusBadge status={profile.status} />
        {profile.hold && profile.status !== "on-hold" && profile.status !== "quarantine" ? (
          <HoldBadge kind={profile.hold.kind} />
        ) : null}
        <Badge>{t(`material.${profile.material}`)}</Badge>
      </div>

      <div className="mb-6 space-y-3">
        <Banners profile={profile} />
      </div>

      <UnitTabs
        label={t("tabsLabel")}
        initial={tab}
        tabs={[
          { id: "overview", label: t("tabs.overview") },
          { id: "history", label: t("tabs.history"), count: ledger.length },
          { id: "lineage", label: t("tabs.lineage") },
          {
            id: "quality",
            label: t("tabs.quality"),
            count: quality.tests.length + quality.incidents.length,
          },
          {
            id: "documents",
            label: t("tabs.documents"),
            count: documents.attachments.length + documents.activities.length,
          },
        ]}
        panels={{
          overview: <UnitOverview profile={profile} profileUrl={profileUrl} />,
          history: (
            <LedgerList events={ledger} exportHref={`/inventory/units/${profile.id}/export`} />
          ),
          lineage: <UnitHierarchyPanel profile={profile} />,
          quality: <UnitQaPanels quality={quality} />,
          documents: (
            <UnitExtrasPanels
              unitId={profile.id}
              documents={documents}
              viewerId={viewerId}
              canEdit={profile.access.canEdit}
              isAdmin={profile.access.isAdmin}
              terminal={profile.terminal !== null}
            />
          ),
        }}
      />
    </UnitActionsProvider>
  );
}

/** What stops the unit, and why: a final state, a quality hold, or no right to change it. */
function Banners({ profile }: { profile: UnitProfile }) {
  const t = useTranslations("units.detail.banners");
  const domain = useTranslations("domain");
  const { hold, destruction, shipment } = profile;

  return (
    <>
      {destruction ? (
        <Banner tone="danger" title={t("destroyedTitle")}>
          <p>
            {t.rich("destroyedBody", {
              by: richValue(
                <EntityLink kind="member" id={destruction.recordedById}>
                  {destruction.recordedBy ?? domain("empty")}
                </EntityLink>
              ),
            })}{" "}
            <When value={destruction.at} />
          </p>
          <p>
            <span className="font-medium">{t("reason")}</span>{" "}
            {destruction.reason ?? domain("empty")}
          </p>
          <p>
            <span className="font-medium">{t("witness")}</span>{" "}
            <EntityLink kind="member" id={destruction.witnessId}>
              {destruction.witness ?? domain("empty")}
            </EntityLink>
          </p>
          <p className="mt-1">{t("destroyedReadOnly")}</p>
        </Banner>
      ) : null}

      {shipment ? (
        <Banner tone="info" title={t("shippedTitle")}>
          <p>
            {shipment.organization
              ? t.rich("shippedTo", {
                  organization: richValue(
                    <EntityLink kind="organization" id={shipment.organizationId}>
                      {shipment.organization}
                    </EntityLink>
                  ),
                })
              : t("shippedUnknown")}{" "}
            <When value={shipment.at} />
          </p>
          <p className="mt-1">{t("shippedReadOnly")}</p>
        </Banner>
      ) : null}

      {hold ? (
        <Banner tone="warning" title={t("holdTitle", { kind: domain(`holdKind.${hold.kind}`) })}>
          <p>
            <span className="font-medium">{t("reason")}</span> {hold.reason}
          </p>
          <p>
            {t.rich("holdPlaced", {
              by: richValue(
                <EntityLink kind="member" id={hold.placedById}>
                  {hold.placedBy}
                </EntityLink>
              ),
              origin: domain(`holdOrigin.${hold.origin}`),
            })}{" "}
            <When value={hold.placedAt} />
          </p>
          <p className="mt-1">{t("holdEffect")}</p>
          {profile.access.isAdmin ? (
            <div className="mt-3">
              <ActionButton action="releaseHold" variant="primary" />
            </div>
          ) : (
            <p className="mt-1 font-medium">{t("holdAdminOnly")}</p>
          )}
        </Banner>
      ) : null}

      {!profile.terminal && !profile.access.canEdit ? (
        <Banner tone="info">{t("readOnly")}</Banner>
      ) : null}
    </>
  );
}
