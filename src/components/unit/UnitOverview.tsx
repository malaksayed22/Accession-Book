import { useFormatter, useTranslations } from "next-intl";
import { EntityLink } from "@/components/page/EntityLink";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { UnitCodesPanel } from "@/components/UnitCodesPanel";
import { UnitLocationHistory } from "@/components/UnitLocationHistory";
import { UnitStageDurations } from "@/components/UnitStageDurations";
import type { UnitProfile } from "@/features/unit/queries";
import { Link } from "@/i18n/navigation";
import { ActionButton } from "./UnitActions";
import { Day, Fact, FactList, Grams, Stamp, When, linkClass } from "./common";

/** Overview tab: the key facts of the record, its provenance, notes, label and timing. */
export function UnitOverview({
  profile,
  profileUrl,
}: {
  profile: UnitProfile;
  profileUrl: string;
}) {
  const t = useTranslations("units.panels.overview");
  const detail = useTranslations("units.detail");
  const domain = useTranslations("domain");
  const format = useFormatter();
  const { current, source } = profile;
  const empty = domain("empty");

  const stageText = (() => {
    if (profile.terminal) return domain(`stateKind.${profile.terminal}`);
    if (profile.type === "SEEDLOT") {
      return current?.seedCount != null
        ? t("seedLotCount", { count: current.seedCount })
        : domain("unitType.SEEDLOT");
    }
    if (profile.type === "CULTURE") return t("inCulture");
    if (!current?.growthStage) return empty;
    return (
      <Link href={`/inventory/units?stage=${current.growthStage}`} className={linkClass}>
        {domain(`growthStage.${current.growthStage}`)}
      </Link>
    );
  })();
  const showWeights =
    profile.type === "PLANT" || profile.type === "FLOWER"
      ? profile.weights.isHarvested ||
        profile.weights.humid !== null ||
        profile.weights.dry !== null
      : false;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={t("factsTitle")} description={t("factsDescription")} />
          <PanelBody>
            <FactList>
              <Fact label={t("cultivar")}>
                {profile.cultivar ? (
                  <Link href={`/records/cultivars/${profile.cultivar.id}`} className={linkClass}>
                    {profile.cultivar.name}
                  </Link>
                ) : (
                  empty
                )}
              </Fact>
              <Fact label={t("experiment")}>
                {profile.experiment ? (
                  <Link
                    href={`/inventory/experiments/${profile.experiment.id}`}
                    className={linkClass}
                  >
                    {profile.experiment.ecode} · {profile.experiment.name}
                  </Link>
                ) : (
                  empty
                )}
              </Fact>
              <Fact label={t("location")}>
                <EntityLink kind="location" id={current?.locationId}>
                  {current?.locationName ?? empty}
                </EntityLink>
              </Fact>
              <Fact label={t("stage")}>{stageText}</Fact>
              <Fact label={t("material")}>{detail(`material.${profile.material}`)}</Fact>
              <Fact label={t("sex")}>
                {profile.sex
                  ? profile.sex === "MALE" ||
                    profile.sex === "FEMALE" ||
                    profile.sex === "HERMAPHRODITE"
                    ? t(`sexValues.${profile.sex}`)
                    : profile.sex
                  : empty}
              </Fact>
              {showWeights ? (
                <>
                  <Fact label={t("humidWeight")}>
                    <Grams value={profile.weights.humid} />
                  </Fact>
                  <Fact label={t("dryWeight")}>
                    <Grams value={profile.weights.dry} />
                  </Fact>
                </>
              ) : null}
              {profile.type === "SEEDLOT" ? (
                <Fact label={t("seedCount")}>
                  {current?.seedCount != null ? format.number(current.seedCount, "count") : empty}
                </Fact>
              ) : null}
              <Fact label={t("registered")}>
                <When value={profile.createdAt} />
              </Fact>
              <Fact label={t("lastEvent")} wide>
                {current ? (
                  <span className="flex flex-col">
                    <span>
                      {domain(`stateKind.${current.kind}`)} ·{" "}
                      {t("sequence", { number: current.sequence })}
                    </span>
                    <Stamp
                      who={current.recordedBy}
                      whoId={current.recordedById}
                      at={current.recordedAt}
                    />
                  </span>
                ) : (
                  empty
                )}
              </Fact>
            </FactList>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader title={t("sourceTitle")} description={t("sourceDescription")} />
          <PanelBody>
            <FactList>
              <Fact label={t("sourceType")}>
                {source.type ? domain(`sourceType.${source.type}`) : empty}
              </Fact>
              <Fact label={t("provider")}>
                {source.provider ? (
                  <>
                    <EntityLink kind="organization" id={source.provider.id}>
                      {source.provider.name}
                    </EntityLink>
                    {source.provider.country ? ` (${source.provider.country})` : null}
                  </>
                ) : (
                  t("internal")
                )}
              </Fact>
              {source.provider ? (
                <>
                  <Fact label={t("receivedOn")}>
                    <Day value={source.receivedAt} />
                  </Fact>
                  <Fact label={t("receptionNotes")}>{source.receptionNote ?? empty}</Fact>
                </>
              ) : null}
              <Fact label={t("parent")} wide>
                {profile.parent ? (
                  <Link href={`/inventory/units/${profile.parent.id}`} className={linkClass}>
                    {profile.parent.name}
                  </Link>
                ) : (
                  empty
                )}
              </Fact>
              <Fact label={t("sourceNote")} wide>
                {source.description ?? empty}
              </Fact>
            </FactList>
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader
          title={t("notesTitle")}
          description={t("notesDescription")}
          actions={<ActionButton action="edit" />}
        />
        <PanelBody>
          {profile.notes ? (
            <p className="whitespace-pre-wrap text-sm text-fg">{profile.notes}</p>
          ) : (
            <p className="text-sm text-fg-secondary">{t("noNotes")}</p>
          )}
        </PanelBody>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        {profile.type === "PLANT" || profile.type === "FLOWER" ? (
          <UnitStageDurations summary={profile.stageDurations} />
        ) : null}
        <UnitLocationHistory history={profile.locationHistory} />
      </div>

      <UnitCodesPanel
        unitId={profile.id}
        unitName={profile.name}
        unitTypeLabel={domain(`unitType.${profile.type}`)}
        cultivarName={profile.cultivar?.name}
        profileUrl={profileUrl}
        mother={profile.lineage.mother}
      />
    </div>
  );
}
