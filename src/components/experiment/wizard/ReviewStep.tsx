"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/FormControls";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { CALENDAR_DAY_FORMAT } from "@/features/experiment/dates";
import { previewUnitCodes, unitCodeFor } from "@/lib/experiment-codes";
import { findIntakeKind } from "@/lib/experiment-intake";
import { checkCapacity, plannedUnits, type UnitGroup, type WizardStep } from "./wizard-state";
import type { StepProps } from "./step-props";
import { useIssueMessage } from "./use-issue-message";

/** Step 4: everything that will be recorded, read back before it is written. */
export function ReviewStep({
  state,
  dispatch,
  errors,
  options,
  assignedCode,
  capacityConflict,
  onEdit,
}: StepProps & {
  assignedCode: string;
  capacityConflict: boolean;
  onEdit: (step: WizardStep) => void;
}) {
  const t = useTranslations("experiments.wizard.review");
  const message = useIssueMessage();
  const format = useFormatter();

  const total = plannedUnits(state);
  const location = options.locations.find((l) => String(l.id) === state.locationId);
  const capacity = checkCapacity(location, total);
  const overCapacity = capacity.status === "exceeded" || capacityConflict;
  const day = (value: string) => format.dateTime(new Date(value), CALENDAR_DAY_FORMAT);
  const parent = options.parentOptions.find((p) => String(p.id) === state.parentExperimentId);
  const members = options.users.filter((u) => state.memberIds.includes(u.id));
  const supplier = options.organizations.find((o) => String(o.id) === state.providerId);
  const external = state.providerMode === "EXTERNAL";

  return (
    <div className="space-y-5">
      <p className="text-sm text-fg-secondary">{t("intro")}</p>

      <ReviewSection title={t("identity")} onChange={() => onEdit("identity")}>
        <Row label={t("name")}>{state.name.trim()}</Row>
        <Row label={t("code")}>
          <span className="font-mono">{assignedCode}</span>
        </Row>
        <Row label={t("period")}>
          {day(state.startDate)}
          {" – "}
          {day(state.endDate)}
        </Row>
        <Row label={t("parent")}>{parent ? `${parent.ecode} — ${parent.name}` : t("noParent")}</Row>
        <Row label={t("team")}>
          {[t("you", { name: options.user.name }), ...members.map((m) => m.name)].join(", ")}
        </Row>
        <Row label={t("notes")}>{state.comment.trim() || t("none")}</Row>
      </ReviewSection>

      <ReviewSection title={t("units")} onChange={() => onEdit("units")}>
        {state.groups.length === 0 ? (
          <Row label={t("startingUnits")}>{t("noUnits")}</Row>
        ) : (
          <>
            <Row label={t("startingUnits")}>
              {t("unitTotal", { count: total })}
              {" · "}
              <span className="font-mono">
                {previewUnitCodes(assignedCode, total).join(", ")}
                {total > 3 ? ` … ${unitCodeFor(assignedCode, total)}` : ""}
              </span>
            </Row>
            {state.groups.map((group, index) => (
              <GroupRow key={group.key} group={group} index={index} cultivars={options.cultivars} />
            ))}
          </>
        )}
      </ReviewSection>

      <ReviewSection title={t("source")} onChange={() => onEdit("source")}>
        {total > 0 ? (
          <>
            <Row label={t("location")}>{location?.name ?? t("none")}</Row>
            <Row label={t("sourceMode")}>{external ? t("external") : t("internal")}</Row>
            {external ? (
              <>
                <Row label={t("supplier")}>{supplier?.name ?? t("none")}</Row>
                <Row label={t("receipt")}>
                  {state.createReceipt ? t("receiptYes") : t("receiptNo")}
                </Row>
                {state.createReceipt ? (
                  <Row label={t("manifest")}>{state.manifestNumber.trim() || t("none")}</Row>
                ) : null}
              </>
            ) : (
              <Row label={t("internalDescription")}>
                {state.sourceDescription.trim() || t("none")}
              </Row>
            )}
          </>
        ) : (
          <Row label={t("source")}>{t("noUnitsSource")}</Row>
        )}
      </ReviewSection>

      {overCapacity ? (
        <div className="space-y-3">
          <Banner tone="warning" title={t("capacityTitle")}>
            {capacity.status === "exceeded"
              ? t("capacityBody", {
                  name: location?.name ?? "",
                  planned: capacity.projected,
                  capacity: capacity.capacity,
                  occupancy: capacity.occupancy,
                })
              : t("capacityConflictBody")}
          </Banner>
          <Checkbox
            label={t("capacityOverride")}
            description={t("capacityOverrideHint")}
            checked={state.capacityOverride}
            aria-invalid={errors.capacityOverride ? true : undefined}
            onChange={(e) =>
              dispatch({ type: "set", patch: { capacityOverride: e.target.checked } })
            }
          />
          {errors.capacityOverride ? (
            <p className="text-sm font-medium text-danger">{message(errors.capacityOverride)}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReviewSection({
  title,
  onChange,
  children,
}: {
  title: string;
  onChange: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("experiments.wizard.review");
  return (
    <Panel>
      <PanelHeader
        title={title}
        headingLevel={3}
        actions={
          <Button variant="ghost" size="sm" onClick={onChange}>
            {t("change")}
            <span className="sr-only"> {title}</span>
          </Button>
        }
      />
      <PanelBody>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[12rem_1fr]">{children}</dl>
      </PanelBody>
    </Panel>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="min-w-0 wrap-break-word text-fg">{children}</dd>
    </>
  );
}

function GroupRow({
  group,
  index,
  cultivars,
}: {
  group: UnitGroup;
  index: number;
  cultivars: ReadonlyArray<{ id: number; name: string }>;
}) {
  const t = useTranslations("experiments.wizard.review");
  const kinds = useTranslations("experiments.wizard.kinds");
  const stages = useTranslations("domain.growthStage");
  const kind = findIntakeKind(group.kind);
  const name = (id: string) => cultivars.find((c) => String(c.id) === id)?.name ?? id;

  const cultivar =
    group.cultivarMode === "SAME"
      ? name(group.cultivarId)
      : Object.entries(group.cultivarBreakdown)
          .filter(([, count]) => Number(count) > 0)
          .map(([id, count]) => `${name(id)} (${count})`)
          .join(", ");
  const status =
    !kind || kind.stages.length === 0
      ? null
      : group.statusMode === "SAME"
        ? stages(group.status as "VEGETATIVE")
        : Object.entries(group.breakdown)
            .filter(([, count]) => Number(count) > 0)
            .map(([stage, count]) => `${stages(stage as "VEGETATIVE")} (${count})`)
            .join(", ");

  const details = [
    cultivar,
    status,
    group.seedsPerLot ? t("seedsPerLot", { count: Number(group.seedsPerLot) }) : null,
    group.wetWeightGrams ? t("wetWeight", { grams: group.wetWeightGrams }) : null,
    group.dryWeightGrams ? t("dryWeight", { grams: group.dryWeightGrams }) : null,
  ].filter(Boolean);

  return (
    <Row label={t("group", { number: index + 1 })}>
      <span className="font-medium">
        {t("groupLine", { quantity: Number(group.quantity) || 0, kind: kinds(group.kind) })}
      </span>
      {details.length > 0 ? (
        <span className="block text-fg-secondary">{details.join(" · ")}</span>
      ) : null}
    </Row>
  );
}
