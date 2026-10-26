"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import type { ApiErrorBody } from "@/lib/api-error";
import { sendJson, type ApiResult } from "@/lib/client-api";
import { toDateInputValue } from "@/lib/format";
import {
  ACTIVITY_TYPE_IDS,
  ATTACHMENT_CATEGORY_IDS,
  HOLD_KIND_IDS,
  INCIDENT_SEVERITY_IDS,
  STATED_VERDICT_IDS,
  TEST_PANEL_IDS,
} from "@/lib/unit-action-constants";
import { ActionDialog } from "./ActionDialog";
import type { DialogProps } from "./action-types";

/*
 * Forms for the records that do not change the unit's custody: quality hold, lab result, incident,
 * activity and document. A hold does not block any of them; only a unit that has left inventory does.
 */

const NOTE_MAX = 2000;
const HOLD_REASON_MIN = 3;

export function HoldDialog({ unit, onClose }: DialogProps) {
  const t = useTranslations("units.actions.hold");
  const domain = useTranslations("domain");
  const [kind, setKind] = useState<(typeof HOLD_KIND_IDS)[number]>("HOLD");
  const [reason, setReason] = useState("");

  return (
    <ActionDialog
      title={t("title")}
      description={t("description", { name: unit.name })}
      submitLabel={t("submit")}
      canSubmit={reason.trim().length >= HOLD_REASON_MIN}
      send={() =>
        sendJson(`/api/units/${unit.id}/hold`, { action: "hold", kind, reason: reason.trim() })
      }
      successTitle={() => t("success")}
      onClose={onClose}
    >
      <Field label={t("kind")} hint={t(`kindHints.${kind}`)} required>
        {(control) => (
          <Select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
            {...control}
          >
            {HOLD_KIND_IDS.map((id) => (
              <option key={id} value={id}>
                {domain(`holdKind.${id}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("reason")} hint={t("reasonHint")} required>
        {(control) => (
          <Textarea
            rows={3}
            value={reason}
            maxLength={NOTE_MAX}
            onChange={(e) => setReason(e.target.value)}
            {...control}
          />
        )}
      </Field>
      <Banner tone="info">{t("next")}</Banner>
    </ActionDialog>
  );
}

export function TestDialog({ unit, onClose }: DialogProps) {
  const t = useTranslations("units.actions.test");
  const domain = useTranslations("domain");
  const [panel, setPanel] = useState<(typeof TEST_PANEL_IDS)[number]>("POTENCY");
  const [analyte, setAnalyte] = useState("");
  const [value, setValue] = useState("");
  const [uom, setUom] = useState("");
  const [limitMin, setLimitMin] = useState("");
  const [limitMax, setLimitMax] = useState("");
  const [verdict, setVerdict] = useState("");
  const [lab, setLab] = useState("");
  const [testedAt, setTestedAt] = useState("");
  const [comment, setComment] = useState("");

  const qualitative = value.trim() === "";
  const complete =
    analyte.trim() !== "" && (!qualitative ? true : verdict !== "" && lab.trim() !== "");

  return (
    <ActionDialog
      title={t("title")}
      description={t("description", { name: unit.name })}
      submitLabel={t("submit")}
      size="lg"
      canSubmit={complete}
      send={() =>
        sendJson<{
          test: { verdict: "PASS" | "FAIL" | "INCONCLUSIVE" | "RECORDED" };
          autoHeld: boolean;
        }>(`/api/units/${unit.id}/tests`, {
          panel,
          analyte: analyte.trim(),
          value: qualitative ? undefined : Number(value),
          uom: uom.trim() || undefined,
          limitMin: limitMin === "" ? undefined : Number(limitMin),
          limitMax: limitMax === "" ? undefined : Number(limitMax),
          verdict: qualitative ? verdict : undefined,
          labName: lab.trim() || undefined,
          testedAt: testedAt || undefined,
          comment: comment.trim() || undefined,
        })
      }
      successTitle={(data) =>
        data.autoHeld
          ? t("successHeld", { verdict: domain(`testVerdict.${data.test.verdict}`) })
          : t("success", { verdict: domain(`testVerdict.${data.test.verdict}`) })
      }
      onClose={onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("panel")} required>
          {(control) => (
            <Select
              value={panel}
              onChange={(e) => setPanel(e.target.value as typeof panel)}
              {...control}
            >
              {TEST_PANEL_IDS.map((id) => (
                <option key={id} value={id}>
                  {domain(`testPanel.${id}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label={t("analyte")} required>
          {(control) => (
            <Input
              value={analyte}
              maxLength={120}
              onChange={(e) => setAnalyte(e.target.value)}
              autoComplete="off"
              {...control}
            />
          )}
        </Field>
        <Field label={t("value")} hint={t("valueHint")}>
          {(control) => (
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              {...control}
            />
          )}
        </Field>
        <Field label={t("uom")}>
          {(control) => (
            <Input
              value={uom}
              maxLength={40}
              onChange={(e) => setUom(e.target.value)}
              autoComplete="off"
              {...control}
            />
          )}
        </Field>
        <Field label={t("limitMin")}>
          {(control) => (
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              value={limitMin}
              onChange={(e) => setLimitMin(e.target.value)}
              {...control}
            />
          )}
        </Field>
        <Field label={t("limitMax")}>
          {(control) => (
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              value={limitMax}
              onChange={(e) => setLimitMax(e.target.value)}
              {...control}
            />
          )}
        </Field>
      </div>
      {qualitative ? (
        <Field label={t("verdict")} hint={t("verdictHint")} required>
          {(control) => (
            <Select value={verdict} onChange={(e) => setVerdict(e.target.value)} {...control}>
              <option value="">{t("chooseVerdict")}</option>
              {STATED_VERDICT_IDS.map((id) => (
                <option key={id} value={id}>
                  {domain(`testVerdict.${id}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : (
        <Banner tone="info">{t("computed")}</Banner>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t("lab")}
          hint={qualitative ? t("labRequired") : undefined}
          required={qualitative}
        >
          {(control) => (
            <Input
              value={lab}
              maxLength={200}
              onChange={(e) => setLab(e.target.value)}
              autoComplete="off"
              {...control}
            />
          )}
        </Field>
        <Field label={t("testedOn")} hint={t("testedOnHint")}>
          {(control) => (
            <Input
              type="date"
              value={testedAt}
              max={toDateInputValue()}
              onChange={(e) => setTestedAt(e.target.value)}
              {...control}
            />
          )}
        </Field>
      </div>
      <Field label={t("note")}>
        {(control) => (
          <Textarea
            rows={2}
            value={comment}
            maxLength={NOTE_MAX}
            onChange={(e) => setComment(e.target.value)}
            {...control}
          />
        )}
      </Field>
      <Banner tone="warning">{t("failHolds")}</Banner>
    </ActionDialog>
  );
}

export function IncidentDialog({ unit, onClose }: DialogProps) {
  const t = useTranslations("units.actions.incident");
  const domain = useTranslations("domain");
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<(typeof INCIDENT_SEVERITY_IDS)[number]>("MAJOR");
  const [description, setDescription] = useState("");

  return (
    <ActionDialog
      title={t("title")}
      description={t("description", { name: unit.name })}
      submitLabel={t("submit")}
      canSubmit={title.trim() !== "" && description.trim() !== ""}
      send={() =>
        sendJson<{ autoHeld: boolean }>("/api/qa/incidents", {
          title: title.trim(),
          description: description.trim(),
          severity,
          unitId: unit.id,
        })
      }
      successTitle={(data) => (data.autoHeld ? t("successHeld") : t("success"))}
      onClose={onClose}
    >
      <Field label={t("name")} required>
        {(control) => (
          <Input
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
            {...control}
          />
        )}
      </Field>
      <Field label={t("severity")} hint={t("severityHint")} required>
        {(control) => (
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as typeof severity)}
            {...control}
          >
            {INCIDENT_SEVERITY_IDS.map((id) => (
              <option key={id} value={id}>
                {domain(`incidentSeverity.${id}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("details")} required>
        {(control) => (
          <Textarea
            rows={4}
            value={description}
            maxLength={5000}
            onChange={(e) => setDescription(e.target.value)}
            {...control}
          />
        )}
      </Field>
    </ActionDialog>
  );
}

export function ActivityDialog({ unit, onClose }: DialogProps) {
  const t = useTranslations("units.actions.activity");
  const domain = useTranslations("domain");
  const [type, setType] = useState<(typeof ACTIVITY_TYPE_IDS)[number]>("TREATMENT");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");

  return (
    <ActionDialog
      title={t("title")}
      description={t("description", { name: unit.name })}
      submitLabel={t("submit")}
      canSubmit={title.trim() !== ""}
      send={() =>
        sendJson(`/api/units/${unit.id}/activities`, {
          type,
          title: title.trim(),
          details: details.trim() || undefined,
        })
      }
      successTitle={() => t("success")}
      onClose={onClose}
    >
      <Field label={t("type")} required>
        {(control) => (
          <Select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            {...control}
          >
            {ACTIVITY_TYPE_IDS.map((id) => (
              <option key={id} value={id}>
                {domain(`activityType.${id}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("name")} required>
        {(control) => (
          <Input
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
            {...control}
          />
        )}
      </Field>
      <Field label={t("details")}>
        {(control) => (
          <Textarea
            rows={4}
            value={details}
            maxLength={5000}
            onChange={(e) => setDetails(e.target.value)}
            {...control}
          />
        )}
      </Field>
    </ActionDialog>
  );
}

/** Documents travel as multipart form data, which `sendJson` does not do; same result contract. */
async function sendForm<T>(url: string, body: FormData): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body });
  } catch {
    return { ok: false, error: null, network: true };
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) return { ok: false, error: data as ApiErrorBody | null, network: false };
  return { ok: true, data: data as T };
}

export function UploadDialog({ unit, onClose }: DialogProps) {
  const t = useTranslations("units.actions.upload");
  const domain = useTranslations("domain");
  const [category, setCategory] = useState<(typeof ATTACHMENT_CATEGORY_IDS)[number]>("PHOTO");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <ActionDialog
      title={t("title")}
      description={t("description", { name: unit.name })}
      submitLabel={t("submit")}
      canSubmit={label.trim() !== "" && file !== null}
      send={() => {
        const form = new FormData();
        if (file) form.append("file", file);
        form.append("label", label.trim());
        form.append("category", category);
        return sendForm<{ ok: true }>(`/api/units/${unit.id}/attachments`, form);
      }}
      successTitle={() => t("success")}
      onClose={onClose}
    >
      <Field label={t("category")} required>
        {(control) => (
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            {...control}
          >
            {ATTACHMENT_CATEGORY_IDS.map((id) => (
              <option key={id} value={id}>
                {domain(`attachmentCategory.${id}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("label")} hint={t("labelHint")} required>
        {(control) => (
          <Input
            value={label}
            maxLength={200}
            onChange={(e) => setLabel(e.target.value)}
            autoComplete="off"
            {...control}
          />
        )}
      </Field>
      <Field label={t("file")} hint={t("fileHint")} required>
        {(control) => (
          <Input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt,application/pdf,image/png,image/jpeg,image/webp,text/csv,text/plain"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            {...control}
          />
        )}
      </Field>
    </ActionDialog>
  );
}
