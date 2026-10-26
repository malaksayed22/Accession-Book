"use client";

import { BookmarkPlus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/FormControls";
import { Panel, PanelBody } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/Toast";
import { previewUnitCodes, unitCodeFor } from "@/lib/experiment-codes";
import {
  deleteIntakeTemplate,
  listIntakeTemplates,
  saveIntakeTemplate,
  type IntakeTemplate,
} from "@/lib/experiment-intake-templates";
import { UnitGroupEditor } from "./UnitGroupEditor";
import { plannedUnits, snapshotOf } from "./wizard-state";
import type { StepProps } from "./step-props";
import { useIssueMessage } from "./use-issue-message";

/** Step 2: the material the experiment starts with, as one or more groups of units. */
export function UnitsStep({
  state,
  dispatch,
  errors,
  options,
  assignedCode,
}: StepProps & { assignedCode: string }) {
  const t = useTranslations("experiments.wizard.units");
  const message = useIssueMessage();
  const total = plannedUnits(state);
  const userId = options.user.id;

  return (
    <div className="space-y-5">
      <TemplateBar
        userId={userId}
        suggestedName={state.name.trim()}
        onApply={(template) => dispatch({ type: "applyTemplate", snapshot: template.snapshot })}
        snapshot={() => snapshotOf(state)}
      />

      {errors.groups ? <Banner tone="danger">{message(errors.groups)}</Banner> : null}

      {state.groups.length === 0 ? (
        <Panel>
          <PanelBody className="space-y-1 text-center">
            <p className="font-medium text-fg">{t("noneTitle")}</p>
            <p className="text-sm text-fg-secondary">{t("noneBody")}</p>
          </PanelBody>
        </Panel>
      ) : (
        state.groups.map((group, index) => (
          <UnitGroupEditor
            key={group.key}
            group={group}
            index={index}
            cultivars={options.cultivars}
            errors={errors}
            canRemove
            onChange={(patch) => dispatch({ type: "updateGroup", key: group.key, patch })}
            onChangeKind={(kind) => dispatch({ type: "changeKind", key: group.key, kind })}
            onRemove={() => dispatch({ type: "removeGroup", key: group.key })}
          />
        ))
      )}

      <Button variant="secondary" icon={<Plus />} onClick={() => dispatch({ type: "addGroup" })}>
        {t("addGroup")}
      </Button>

      {total > 0 ? (
        <p className="rounded-lg bg-sunken px-3 py-2 text-sm text-fg-secondary" aria-live="polite">
          {t("summary", { count: total })}{" "}
          <span className="font-mono text-fg">
            {previewUnitCodes(assignedCode, total).join(", ")}
            {total > 3 ? ` … ${unitCodeFor(assignedCode, total)}` : ""}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Saved starting-material patterns. They live in this browser's localStorage, per signed-in user, and
 * hold whatever the person typed (cultivar ids, quantities); nothing is sent to the server.
 */
function TemplateBar({
  userId,
  suggestedName,
  snapshot,
  onApply,
}: {
  userId: number;
  suggestedName: string;
  snapshot: () => IntakeTemplate["snapshot"];
  onApply: (template: IntakeTemplate) => void;
}) {
  const t = useTranslations("experiments.wizard.templates");
  const { toast } = useToast();
  const [templates, setTemplates] = useState<IntakeTemplate[]>(() => listIntakeTemplates(userId));
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");

  const save = () => {
    const templateName = name.trim() || suggestedName;
    if (!templateName) {
      toast({ tone: "warning", title: t("nameNeeded") });
      return;
    }
    try {
      saveIntakeTemplate(userId, templateName, snapshot());
    } catch {
      toast({ tone: "danger", title: t("saveFailed") });
      return;
    }
    setTemplates(listIntakeTemplates(userId));
    setSelectedId("");
    setName("");
    toast({ tone: "success", title: t("saved", { name: templateName }) });
  };

  const remove = () => {
    if (!selectedId) return;
    try {
      deleteIntakeTemplate(userId, selectedId);
    } catch {
      toast({ tone: "danger", title: t("saveFailed") });
      return;
    }
    setTemplates(listIntakeTemplates(userId));
    setSelectedId("");
    toast({ tone: "success", title: t("deleted") });
  };

  return (
    <Panel>
      <PanelBody className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-fg">{t("title")}</h3>
          <p className="text-sm text-fg-secondary">{t("description")}</p>
        </div>
        <div className="grid items-end gap-3 lg:grid-cols-2">
          <div className="flex items-end gap-2">
            <Field className="flex-1" label={t("load")}>
              {(control) => (
                <Select
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    const template = templates.find((item) => item.id === e.target.value);
                    if (template) onApply(template);
                  }}
                  disabled={templates.length === 0}
                  {...control}
                >
                  <option value="">{templates.length === 0 ? t("noneSaved") : t("choose")}</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            {selectedId ? (
              <Button variant="danger" icon={<Trash2 />} onClick={remove}>
                {t("delete")}
              </Button>
            ) : null}
          </div>
          <div className="flex items-end gap-2">
            <Field className="flex-1" label={t("name")}>
              {(control) => (
                <Input
                  value={name}
                  maxLength={80}
                  autoComplete="off"
                  placeholder={suggestedName || t("namePlaceholder")}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      save();
                    }
                  }}
                  {...control}
                />
              )}
            </Field>
            <Button variant="secondary" icon={<BookmarkPlus />} onClick={save}>
              {t("save")}
            </Button>
          </div>
        </div>
      </PanelBody>
    </Panel>
  );
}
