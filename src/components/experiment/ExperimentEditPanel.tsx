"use client";

import { Pencil } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { ExperimentStatusBadge } from "@/components/experiment/ExperimentStatusBadge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/FormControls";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/Toast";
import { CALENDAR_DAY_FORMAT, type ExperimentStatus } from "@/features/experiment/dates";
import { useRouter } from "@/i18n/navigation";
import { useApiError, useNetworkError } from "@/lib/api-error";
import { sendJson } from "@/lib/client-api";
import {
  EXPERIMENT_NAME_MAX,
  EXPERIMENT_NOTES_MAX,
  validateEdit,
  type EditDraft,
  type EditField,
} from "./edit-validation";

type Props = {
  experimentId: number;
  /** Admin or member: whether to offer the edit action. The server decides again on save. */
  canEdit: boolean;
  initial: {
    name: string;
    comment: string | null;
    /** `YYYY-MM-DD` */
    startDate: string;
    /** `YYYY-MM-DD` or null while the experiment has no end date. */
    endDate: string | null;
    status: ExperimentStatus;
  };
};

export function ExperimentEditPanel({ experimentId, canEdit, initial }: Props) {
  const t = useTranslations("experiments.edit");
  const format = useFormatter();
  const router = useRouter();
  const apiError = useApiError();
  const networkError = useNetworkError();
  const { toast } = useToast();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [draft, setDraft] = useState<EditDraft>({
    name: initial.name,
    endDate: initial.endDate ?? "",
    comment: initial.comment ?? "",
  });

  const issues = validateEdit(draft, initial.startDate);
  const error = (field: EditField) => {
    const code = issues[field];
    if (!showErrors || !code) return undefined;
    return t(`errors.${code}`, {
      max: field === "name" ? EXPERIMENT_NAME_MAX : EXPERIMENT_NOTES_MAX,
    });
  };

  const startEditing = () => {
    setDraft({
      name: initial.name,
      endDate: initial.endDate ?? "",
      comment: initial.comment ?? "",
    });
    setShowErrors(false);
    setFailure(null);
    setEditing(true);
  };

  const day = (value: string) => format.dateTime(new Date(value), CALENDAR_DAY_FORMAT);

  async function save(event: FormEvent) {
    event.preventDefault();
    setShowErrors(true);
    if (Object.keys(issues).length > 0) return;
    setSaving(true);
    setFailure(null);
    const result = await sendJson<{ unchanged?: boolean }>(
      `/api/experiments/${experimentId}`,
      {
        name: draft.name.trim(),
        comment: draft.comment.trim(),
        endDate: draft.endDate || undefined,
      },
      "PATCH"
    );
    setSaving(false);
    if (!result.ok) {
      setFailure(result.network ? networkError : apiError(result.error));
      return;
    }
    toast({
      tone: result.data.unchanged ? "info" : "success",
      title: result.data.unchanged ? t("unchanged") : t("saved"),
    });
    setEditing(false);
    router.refresh();
  }

  return (
    <Panel>
      <PanelHeader
        title={t("title")}
        description={canEdit ? t("editableHint") : t("readOnlyHint")}
        actions={
          canEdit && !editing ? (
            <Button variant="secondary" icon={<Pencil />} onClick={startEditing}>
              {t("edit")}
            </Button>
          ) : undefined
        }
      />
      <PanelBody>
        {editing ? (
          <form onSubmit={save} noValidate className="flex max-w-2xl flex-col gap-4">
            {failure ? <Banner tone="danger">{failure}</Banner> : null}
            <Field label={t("name")} required error={error("name")}>
              {(control) => (
                <Input
                  value={draft.name}
                  maxLength={EXPERIMENT_NAME_MAX}
                  autoComplete="off"
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  {...control}
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("startDate")} hint={t("startDateLocked")}>
                {(control) => <Input type="date" value={initial.startDate} disabled {...control} />}
              </Field>
              <Field label={t("endDate")} error={error("endDate")}>
                {(control) => (
                  <Input
                    type="date"
                    value={draft.endDate}
                    min={initial.startDate}
                    onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
                    {...control}
                  />
                )}
              </Field>
            </div>
            <Field label={t("notes")} hint={t("notesHint")} error={error("comment")}>
              {(control) => (
                <Textarea
                  rows={5}
                  value={draft.comment}
                  onChange={(e) => setDraft((d) => ({ ...d, comment: e.target.value }))}
                  {...control}
                />
              )}
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" loading={saving}>
                {t("save")}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                {t("cancel")}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-fg-secondary">{t("status")}</dt>
              <dd className="mt-1">
                <ExperimentStatusBadge status={initial.status} />
              </dd>
            </div>
            <div>
              <dt className="text-fg-secondary">{t("period")}</dt>
              <dd className="mt-1 text-fg">
                {day(initial.startDate)}
                {" – "}
                {initial.endDate ? day(initial.endDate) : t("ongoing")}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-fg-secondary">{t("notes")}</dt>
              <dd className="mt-1 text-fg wrap-break-word whitespace-pre-wrap">
                {initial.comment?.trim() ? initial.comment : t("noNotes")}
              </dd>
            </div>
          </dl>
        )}
      </PanelBody>
    </Panel>
  );
}
