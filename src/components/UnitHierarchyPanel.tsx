import { ChevronRight, FlaskConical, GitBranch } from "lucide-react";
import { useTranslations } from "next-intl";
import { EntityLink } from "@/components/page/EntityLink";
import { richValue } from "@/components/page/rich-value";
import { UnitTypeBadge } from "@/components/page/domain-badges";
import { Button } from "@/components/ui/Button";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { ActionButton } from "@/components/unit/UnitActions";
import { linkClass } from "@/components/unit/common";
import type { UnitProfile } from "@/features/unit/queries";
import { Link } from "@/i18n/navigation";
import { getUnitBarcodeValue } from "@/lib/unit-codes";

/**
 * Lineage tab: where this unit came from (the chain of cuttings back to its mother), what has been
 * derived from it, and the experiments around it. Deriving never changes the parent, so a mother
 * can be cut any number of times.
 */
export function UnitHierarchyPanel({ profile }: { profile: UnitProfile }) {
  const t = useTranslations("units.panels.lineage");
  const { lineage, parent, children, childCount } = profile;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel>
        <PanelHeader
          title={t("originTitle")}
          description={t("originDescription")}
          actions={<ActionButton action="linkParent" />}
        />
        <PanelBody className="space-y-4">
          {lineage.mother ? (
            <>
              <p className="text-sm">
                <span className="text-fg-secondary">{t("mother")}</span>{" "}
                <Link
                  href={`/inventory/units/${lineage.mother.id}`}
                  className={`${linkClass} font-semibold`}
                >
                  {lineage.mother.name}
                </Link>
                <span className="ms-2 font-mono text-xs text-fg-secondary">
                  {getUnitBarcodeValue(lineage.mother.id, lineage.mother.name)}
                </span>
              </p>
              <p className="text-sm text-fg-secondary">
                {t("generation", { count: lineage.generation })}
              </p>
              <nav aria-label={t("ancestry")}>
                <ol className="flex flex-wrap items-center gap-1 text-sm">
                  {lineage.ancestry.map((ancestor) => (
                    <li key={ancestor.id} className="flex items-center gap-1">
                      <Link href={`/inventory/units/${ancestor.id}`} className={linkClass}>
                        {ancestor.name}
                      </Link>
                      <ChevronRight
                        aria-hidden
                        className="size-3.5 text-fg-tertiary rtl:rotate-180"
                      />
                    </li>
                  ))}
                  <li aria-current="page" className="font-medium text-fg">
                    {profile.name}
                  </li>
                </ol>
              </nav>
              {parent?.note ? (
                <p className="text-sm text-fg-secondary">
                  <span className="font-medium">{t("note")}</span> {parent.note}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-fg-secondary">{t("noParent", { name: profile.name })}</p>
          )}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          title={t("derivedTitle")}
          description={t("derivedDescription", { count: childCount })}
          actions={<ActionButton action="derive" />}
        />
        <PanelBody>
          {children.length === 0 ? (
            <p className="text-sm text-fg-secondary">{t("noChildren")}</p>
          ) : (
            <>
              <ul className="divide-y divide-border">
                {children.map((child) => (
                  <li
                    key={child.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span className="min-w-0">
                      <Link
                        href={`/inventory/units/${child.id}`}
                        className={`${linkClass} font-medium`}
                      >
                        {child.name}
                      </Link>
                      {child.note ? (
                        <span className="block text-sm text-fg-secondary">{child.note}</span>
                      ) : null}
                    </span>
                    <UnitTypeBadge type={child.type} />
                  </li>
                ))}
              </ul>
              {childCount > children.length ? (
                <p className="mt-3 text-sm text-fg-secondary">
                  {t("moreChildren", { shown: children.length, total: childCount })}
                </p>
              ) : null}
            </>
          )}
          <p className="mt-4 text-sm text-fg-secondary">{t("deriveNext")}</p>
        </PanelBody>
      </Panel>

      <Panel className="lg:col-span-2">
        <PanelHeader
          title={t("experimentsTitle")}
          description={
            profile.experiment?.leadName
              ? t.rich("experimentsLead", {
                  name: richValue(
                    <EntityLink kind="member" id={profile.experiment.leadId}>
                      {profile.experiment.leadName}
                    </EntityLink>
                  ),
                })
              : t("experimentsDescription")
          }
        />
        <PanelBody className="space-y-4">
          {profile.experimentChain.length === 0 ? (
            <p className="text-sm text-fg-secondary">{t("noExperiment")}</p>
          ) : (
            <ol className="space-y-2">
              {profile.experimentChain.map((experiment, index) => (
                <li
                  key={experiment.id}
                  style={{ marginInlineStart: `${index * 1}rem` }}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <FlaskConical aria-hidden className="size-4 text-fg-secondary" />
                  <Link
                    href={`/inventory/experiments/${experiment.id}`}
                    className={`${linkClass} font-medium`}
                  >
                    {experiment.ecode} · {experiment.name}
                  </Link>
                  <span className="text-fg-secondary">
                    {index < profile.experimentChain.length - 1
                      ? t("parentExperiment")
                      : t("currentExperiment")}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {profile.subExperiments.length > 0 ? (
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
                <GitBranch aria-hidden className="size-4 text-fg-secondary" />
                {t("subExperiments")}
              </h3>
              <ul className="space-y-1 text-sm">
                {profile.subExperiments.map((experiment) => (
                  <li key={experiment.id}>
                    <Link href={`/inventory/experiments/${experiment.id}`} className={linkClass}>
                      {experiment.ecode} · {experiment.name}
                    </Link>{" "}
                    <span className="text-fg-secondary">
                      {experiment.fromThisUnit ? t("spawned") : t("siblingExperiment")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {profile.experiment ? (
            <Button
              href={`/inventory/experiments/${profile.experiment.id}`}
              variant="secondary"
              icon={<FlaskConical />}
            >
              {t("openExperiment", { code: profile.experiment.ecode })}
            </Button>
          ) : null}
        </PanelBody>
      </Panel>
    </div>
  );
}
