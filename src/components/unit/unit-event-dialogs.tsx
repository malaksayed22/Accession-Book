"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import { canConfirm } from "@/components/ui/confirm-logic";
import { useApiError, useNetworkError, type ApiErrorBody } from "@/lib/api-error";
import { sendJson } from "@/lib/client-api";
import { toDateInputValue } from "@/lib/format";
import {
  DERIVE_TYPES,
  SEX_VALUES,
  STAGE_OPTION_IDS,
  type DeriveType,
} from "@/lib/unit-action-constants";
import { ActionDialog } from "./ActionDialog";
import type { DialogProps, Option } from "./action-types";

/*
 * Forms for the events that change a unit: move, stage, measure, derive, edit details, link a parent
 * and destroy. Each one only collects input and calls the existing API route; every rule (who may,
 * whether a hold blocks it, valid dates) is enforced by the service on the server.
 */

const NOTE_MAX = 2000;
const DESTROY_REASON_MIN = 10;

export function MoveDialog({ unit, locations, onClose }: DialogProps & { locations: Option[] }) {
  const t = useTranslations("units.actions.move");
  const [locationId, setLocationId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [comment, setComment] = useState("");
  const options = locations.filter((l) => l.id !== unit.locationId);

  return (
    <ActionDialog
      title={t("title")}
      description={t("description", { name: unit.name })}
      submitLabel={t("submit")}
      canSubmit={locationId !== "" && barcode.trim() !== ""}
      send={() =>
        sendJson<{ location: string }>(`/api/units/${unit.id}/transfer`, {
          toLocationId: Number(locationId),
          barcode: barcode.trim(),
          comment: comment.trim(),
        })
      }
      successTitle={(data) => t("success", { location: data.location })}
      onClose={onClose}
    >
      <Field label={t("destination")} required>
        {(control) => (
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} {...control}>
            <option value="">{t("choose")}</option>
            {options.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("barcode")} hint={t("barcodeHint", { name: unit.name })} required>
        {(control) => (
          <Input
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            {...control}
          />
        )}
      </Field>
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
    </ActionDialog>
  );
}

export function StageDialog({ unit, onClose }: DialogProps) {
  const t = useTranslations("units.actions.stage");
  const domain = useTranslations("domain");
  const [toStage, setToStage] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [comment, setComment] = useState("");
  const options = STAGE_OPTION_IDS.filter((id) => id !== unit.growthStage);

  return (
    <ActionDialog
      title={t("title")}
      description={t("description", { name: unit.name })}
      submitLabel={t("submit")}
      canSubmit={toStage !== ""}
      send={() =>
        sendJson<{ toStage: (typeof STAGE_OPTION_IDS)[number] }>(
          `/api/units/${unit.id}/stage-transition`,
          { toStage, effectiveAt: effectiveAt || undefined, comment: comment.trim() }
        )
      }
      successTitle={(data) => t("success", { stage: domain(`growthStage.${data.toStage}`) })}
      onClose={onClose}
    >
      <Field label={t("newStage")} required>
        {(control) => (
          <Select value={toStage} onChange={(e) => setToStage(e.target.value)} {...control}>
            <option value="">{t("choose")}</option>
            {options.map((id) => (
              <option key={id} value={id}>
                {domain(`growthStage.${id}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("effectiveDate")} hint={t("effectiveDateHint")}>
        {(control) => (
          <Input
            type="date"
            value={effectiveAt}
            max={toDateInputValue()}
            onChange={(e) => setEffectiveAt(e.target.value)}
            {...control}
          />
        )}
      </Field>
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
    </ActionDialog>
  );
}

export function MeasureDialog({ unit, onClose }: DialogProps) {
  const t = useTranslations("units.actions.measure");
  const format = useFormatter();
  const weighs = unit.type === "PLANT" || unit.type === "FLOWER";
  const [humid, setHumid] = useState("");
  const [dry, setDry] = useState("");
  const [seeds, setSeeds] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [comment, setComment] = useState("");

  const current = (value: number | null, formatted: string) =>
    value === null ? t("noCurrent") : t("current", { value: formatted });
  const entered = weighs ? humid !== "" || dry !== "" : seeds !== "";

  return (
    <ActionDialog
      title={t("title")}
      description={t("description", { name: unit.name })}
      submitLabel={t("submit")}
      canSubmit={entered}
      send={() =>
        sendJson(`/api/units/${unit.id}/measure`, {
          humidWeight: weighs && humid !== "" ? Number(humid) : undefined,
          dryWeight: weighs && dry !== "" ? Number(dry) : undefined,
          seedCount: !weighs && seeds !== "" ? Number(seeds) : undefined,
          effectiveAt: effectiveAt || undefined,
          comment: comment.trim(),
        })
      }
      successTitle={() => t("success")}
      onClose={onClose}
    >
      {weighs ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("humidWeight")}
            hint={current(unit.humidWeight, format.number(unit.humidWeight ?? 0, "grams"))}
          >
            {(control) => (
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={humid}
                onChange={(e) => setHumid(e.target.value)}
                {...control}
              />
            )}
          </Field>
          <Field
            label={t("dryWeight")}
            hint={current(unit.dryWeight, format.number(unit.dryWeight ?? 0, "grams"))}
          >
            {(control) => (
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={dry}
                onChange={(e) => setDry(e.target.value)}
                {...control}
              />
            )}
          </Field>
        </div>
      ) : (
        <Field
          label={t("seedCount")}
          hint={current(unit.seedCount, format.number(unit.seedCount ?? 0, "count"))}
        >
          {(control) => (
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              value={seeds}
              onChange={(e) => setSeeds(e.target.value)}
              {...control}
            />
          )}
        </Field>
      )}
      <Field label={t("effectiveDate")} hint={t("effectiveDateHint")}>
        {(control) => (
          <Input
            type="date"
            value={effectiveAt}
            max={toDateInputValue()}
            onChange={(e) => setEffectiveAt(e.target.value)}
            {...control}
          />
        )}
      </Field>
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
    </ActionDialog>
  );
}

export function DeriveDialog({ unit, locations, onClose }: DialogProps & { locations: Option[] }) {
  const t = useTranslations("units.actions.derive");
  const kinds: readonly DeriveType[] = unit.type === "CULTURE" ? ["subculture"] : DERIVE_TYPES;
  const [deriveType, setDeriveType] = useState<DeriveType>(kinds[0] ?? "clone");
  const [quantity, setQuantity] = useState("1");
  const [name, setName] = useState("");
  const [locationId, setLocationId] = useState("");
  const [comment, setComment] = useState("");
  const count = Number(quantity);
  const validCount = Number.isInteger(count) && count >= 1 && count <= 50;

  return (
    <ActionDialog
      title={t("title")}
      description={t("description", { name: unit.name })}
      submitLabel={t("submit")}
      canSubmit={validCount}
      send={() =>
        sendJson<{ units: Array<{ unitId: number; unitName: string }> }>(
          `/api/units/${unit.id}/derive`,
          {
            deriveType,
            quantity: count,
            name: name.trim() || undefined,
            locationId: locationId ? Number(locationId) : undefined,
            comment: comment.trim() || undefined,
          }
        )
      }
      successTitle={(data) =>
        t("success", {
          count: data.units.length,
          names: data.units.map((u) => u.unitName).join(", "),
        })
      }
      onClose={onClose}
    >
      <Field label={t("kind")} required>
        {(control) => (
          <Select
            value={deriveType}
            onChange={(e) => setDeriveType(e.target.value as DeriveType)}
            {...control}
          >
            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {t(`kinds.${kind}`)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("quantity")} hint={t("quantityHint")} required>
          {(control) => (
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={50}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              {...control}
            />
          )}
        </Field>
        <Field label={t("location")} hint={t("locationHint")}>
          {(control) => (
            <Select value={locationId} onChange={(e) => setLocationId(e.target.value)} {...control}>
              <option value="">{t("sameLocation")}</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label={t("name")} hint={t("nameHint", { name: unit.name })}>
        {(control) => (
          <Input
            value={name}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            autoComplete="off"
            {...control}
          />
        )}
      </Field>
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
      <Banner tone="info">{t("next")}</Banner>
    </ActionDialog>
  );
}

export function EditDialog({ unit, onClose }: DialogProps) {
  const t = useTranslations("units.actions.edit");
  const notesOnly = unit.terminal === "DESTROYED";
  const [sex, setSex] = useState(unit.sex ?? "");
  const [notes, setNotes] = useState(unit.notes ?? "");
  const known = (SEX_VALUES as readonly string[]).includes(sex) || sex === "";

  return (
    <ActionDialog
      title={notesOnly ? t("notesTitle") : t("title")}
      description={notesOnly ? t("notesDescription") : t("description", { name: unit.name })}
      submitLabel={t("submit")}
      send={() =>
        sendJson<{ unchanged?: boolean }>(
          `/api/units/${unit.id}`,
          notesOnly ? { comment: notes.trim() } : { comment: notes.trim(), sex },
          "PATCH"
        )
      }
      successTitle={(data) => (data.unchanged ? t("unchanged") : t("success"))}
      onClose={onClose}
    >
      {notesOnly ? null : (
        <Field label={t("sex")}>
          {(control) => (
            <Select value={sex} onChange={(e) => setSex(e.target.value)} {...control}>
              <option value="">{t("sexUnspecified")}</option>
              {known ? null : <option value={sex}>{sex}</option>}
              {SEX_VALUES.map((value) => (
                <option key={value} value={value}>
                  {t(`sexValues.${value}`)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <Field label={t("notes")} hint={t("notesHint", { max: NOTE_MAX })}>
        {(control) => (
          <Textarea
            rows={5}
            value={notes}
            maxLength={NOTE_MAX}
            onChange={(e) => setNotes(e.target.value)}
            {...control}
          />
        )}
      </Field>
    </ActionDialog>
  );
}

type Candidate = { id: number; name: string; type: string };

export function LinkParentDialog({ unit, onClose }: DialogProps) {
  const t = useTranslations("units.actions.linkParent");
  const domain = useTranslations("domain");
  const apiError = useApiError();
  const networkError = useNetworkError();
  const [term, setTerm] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [searchFailure, setSearchFailure] = useState<string | null>(null);
  const [parentId, setParentId] = useState("");
  const [comment, setComment] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const search = (value: string) => {
    setTerm(value);
    setParentId("");
    if (timer.current) clearTimeout(timer.current);
    request.current += 1;
    const current = request.current;
    if (value.trim().length < 2) {
      setCandidates(null);
      setSearchFailure(null);
      return;
    }
    timer.current = setTimeout(async () => {
      let outcome: Candidate[] | string;
      try {
        const response = await fetch(
          `/api/units/${unit.id}/parent-candidates?q=${encodeURIComponent(value.trim())}`
        );
        const body = (await response.json().catch(() => null)) as
          { units?: Candidate[] } | ApiErrorBody | null;
        outcome = response.ok
          ? ((body as { units?: Candidate[] } | null)?.units ?? [])
          : apiError(body as ApiErrorBody | null);
      } catch {
        outcome = networkError;
      }
      if (current !== request.current) return;
      if (typeof outcome === "string") {
        setSearchFailure(outcome);
        setCandidates(null);
      } else {
        setSearchFailure(null);
        setCandidates(outcome);
      }
    }, 250);
  };

  return (
    <ActionDialog
      title={t("title")}
      description={t("description", { name: unit.name })}
      submitLabel={t("submit")}
      canSubmit={parentId !== ""}
      send={() =>
        sendJson<{ parentName: string }>(`/api/units/${unit.id}/lineage`, {
          parentUnitId: Number(parentId),
          comment: comment.trim(),
        })
      }
      successTitle={(data) => t("success", { parent: data.parentName })}
      onClose={onClose}
    >
      <Field label={t("search")} hint={t("searchHint")}>
        {(control) => (
          <Input
            type="search"
            value={term}
            onChange={(e) => search(e.target.value)}
            autoComplete="off"
            {...control}
          />
        )}
      </Field>
      {searchFailure ? <Banner tone="danger">{searchFailure}</Banner> : null}
      {candidates !== null ? (
        <Field
          label={t("parent")}
          hint={
            candidates.length === 0 ? t("noMatches") : t("matches", { count: candidates.length })
          }
          required
        >
          {(control) => (
            <Select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={candidates.length === 0}
              {...control}
            >
              <option value="">{t("choose")}</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({domain(`unitType.${c.type as "PLANT"}`)})
                </option>
              ))}
            </Select>
          )}
        </Field>
      ) : null}
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
      <Banner tone="warning">{t("permanent")}</Banner>
    </ActionDialog>
  );
}

export function DestroyDialog({ unit, witnesses, onClose }: DialogProps & { witnesses: Option[] }) {
  const t = useTranslations("units.actions.destroy");
  const [witnessId, setWitnessId] = useState("");
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");

  const allowed =
    witnessId !== "" &&
    canConfirm({
      reason,
      reasonMinLength: DESTROY_REASON_MIN,
      requireReason: true,
      phrase: unit.name,
      typed,
      pending: false,
    });

  return (
    <ActionDialog
      title={t("title", { name: unit.name })}
      description={t("description")}
      submitLabel={t("submit")}
      tone="danger"
      canSubmit={allowed}
      send={() =>
        sendJson<{ witness: string }>(`/api/units/${unit.id}/destroy`, {
          reason: reason.trim(),
          witnessId: Number(witnessId),
        })
      }
      successTitle={(data) => t("success", { witness: data.witness })}
      onClose={onClose}
    >
      <Banner tone="danger">{t("irreversible")}</Banner>
      <Field label={t("reason")} hint={t("reasonHint", { count: DESTROY_REASON_MIN })} required>
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
      <Field label={t("witness")} hint={t("witnessHint")} required>
        {(control) => (
          <Select value={witnessId} onChange={(e) => setWitnessId(e.target.value)} {...control}>
            <option value="">{t("chooseWitness")}</option>
            {witnesses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t("typeToConfirm", { phrase: `“${unit.name}”` })} required>
        {(control) => (
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            {...control}
          />
        )}
      </Field>
    </ActionDialog>
  );
}
