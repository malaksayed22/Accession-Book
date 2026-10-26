"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState, type FormEvent } from "react";
import { MaterialTotalsText } from "@/components/MaterialFigures";
import { UnitPicker } from "@/components/UnitPicker";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/FormControls";
import { IconButton } from "@/components/ui/IconButton";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { useApiError, useNetworkError } from "@/lib/api-error";
import { sendJson } from "@/lib/client-api";
import { cn } from "@/lib/utils";
import { MATERIAL_CLASSES, isWeightBased, sumMaterials } from "@/lib/materials";
import {
  emptyLine,
  lineProblems,
  linePayload,
  lineQuantity,
  type LineDraft,
  type LineProblem,
} from "@/lib/shipment-draft";

type Direction = "INBOUND" | "OUTBOUND";

/** A unit the picker found, with what a line for it starts from (see `searchShippableUnits`). */
type ShippableUnit = {
  id: number;
  name: string;
  type: "PLANT" | "SEEDLOT" | "FLOWER" | "CULTURE";
  cultivarId: number | null;
  cultivarName: string | null;
  locationName: string | null;
  suggestion: {
    materialType: string;
    unitCount: number | null;
    weightGrams: number | null;
    moisture: "WET" | "DRY" | null;
  };
};

type Props = {
  organizations: Array<{ id: number; name: string; licenceNumber: string | null }>;
  cultivars: Array<{ id: number; name: string }>;
};

type HeaderErrors = { organization?: string };

const STATUSES = ["DRAFT", "IN_TRANSIT", "DELIVERED"] as const;

export function ShipmentForm({ organizations, cultivars }: Props) {
  const t = useTranslations("materials.form");
  const domain = useTranslations("domain");
  const router = useRouter();
  const { toast } = useToast();
  const describe = useApiError();
  const networkMessage = useNetworkError();

  const [direction, setDirection] = useState<Direction>("INBOUND");
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("DRAFT");
  const [shippedDate, setShippedDate] = useState("");
  const [deliveredDate, setDeliveredDate] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [manifestNumber, setManifestNumber] = useState("");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine(1)]);
  const [submitted, setSubmitted] = useState(false);
  const [headerErrors, setHeaderErrors] = useState<HeaderErrors>({});
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);

  const problems = useMemo(() => lineProblems(lines), [lines]);
  const totals = useMemo(() => sumMaterials(lines.map(lineQuantity)), [lines]);
  const outbound = direction === "OUTBOUND";
  const organization = organizations.find((org) => String(org.id) === organizationId);
  const leaves = outbound && status !== "DRAFT";

  const patchLine = (key: number, patch: Partial<LineDraft>) =>
    setLines((previous) =>
      previous.map((line) => (line.key === key ? { ...line, ...patch } : line))
    );
  const nextKey = () => Math.max(0, ...lines.map((line) => line.key)) + 1;

  function changeDirection(next: Direction) {
    setDirection(next);
    // Received material is registered as units elsewhere, so a received line never names a unit.
    if (next === "INBOUND") {
      setLines((previous) =>
        previous.map((line) => (line.unitId ? { ...line, unitId: "", unitName: "" } : line))
      );
    }
  }

  function addUnitLine(unit: ShippableUnit) {
    const { suggestion } = unit;
    const line: LineDraft = {
      ...emptyLine(nextKey()),
      description: unit.name,
      materialType: suggestion.materialType,
      unitCount: suggestion.unitCount === null ? "" : String(suggestion.unitCount),
      weightGrams: suggestion.weightGrams === null ? "" : String(suggestion.weightGrams),
      moisture: suggestion.moisture ?? "",
      cultivarId: unit.cultivarId === null ? "" : String(unit.cultivarId),
      unitId: String(unit.id),
      unitName: unit.name,
    };
    // A starting blank line is replaced instead of left behind.
    setLines((previous) =>
      previous.length === 1 && !previous[0]!.description.trim() ? [line] : [...previous, line]
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFailure("");
    setSubmitted(true);
    const errors: HeaderErrors = {};
    if (!organizationId) errors.organization = t("organizationRequired");
    setHeaderErrors(errors);
    if (errors.organization || Object.keys(problems).length > 0) return;

    setSaving(true);
    const result = await sendJson<{ shipment: { id: number; reference: string } }>(
      "/api/shipments",
      {
        direction,
        organizationId: Number(organizationId),
        status,
        shippedDate: shippedDate || undefined,
        deliveredDate: deliveredDate || undefined,
        trackingNumber: trackingNumber.trim() || undefined,
        manifestNumber: manifestNumber.trim() || undefined,
        licenceNumber: licenceNumber.trim() || undefined,
        address: address.trim() || undefined,
        comment: comment.trim() || undefined,
        items: lines.map(linePayload),
      }
    );
    setSaving(false);
    if (!result.ok) return setFailure(result.network ? networkMessage : describe(result.error));

    toast({
      tone: "success",
      title: t("saved"),
      description: t("savedReference", { reference: result.data.shipment.reference }),
    });
    router.push(`/inventory/materials/${result.data.shipment.id}`);
  }

  const problemText = (problem: LineProblem | undefined, ...only: LineProblem[]) =>
    submitted && problem && only.includes(problem) ? t(`problems.${problem}`) : undefined;

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {failure ? <Banner tone="danger">{failure}</Banner> : null}

      <Panel>
        <PanelHeader title={t("movementTitle")} />
        <PanelBody className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium text-fg">{t("direction")}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["INBOUND", "OUTBOUND"] as const).map((value) => (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border-input bg-surface px-4 py-3 text-sm font-medium text-fg",
                    "has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent-text",
                    "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus"
                  )}
                >
                  <input
                    type="radio"
                    name="direction"
                    value={value}
                    checked={direction === value}
                    onChange={() => changeDirection(value)}
                    className="size-4 shrink-0 p-0 accent-accent"
                  />
                  {value === "INBOUND" ? t("receiving") : t("shipping")}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={outbound ? t("organizationTo") : t("organizationFrom")}
              error={headerErrors.organization}
              required
            >
              {(control) => (
                <Select
                  {...control}
                  value={organizationId}
                  onChange={(event) => {
                    setOrganizationId(event.target.value);
                    setHeaderErrors({});
                  }}
                >
                  <option value="">{t("organizationPlaceholder")}</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={t("status")} hint={leaves ? t("statusLeavesHint") : undefined}>
              {(control) => (
                <Select
                  {...control}
                  value={status}
                  onChange={(event) => setStatus(event.target.value as (typeof STATUSES)[number])}
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {domain(`shipmentStatus.${value}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            <Field label={outbound ? t("dateShipped") : t("dateDispatched")} hint={t("dateHint")}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={shippedDate}
                  onChange={(event) => setShippedDate(event.target.value)}
                />
              )}
            </Field>

            <Field label={outbound ? t("dateDelivered") : t("dateReceived")} hint={t("dateHint")}>
              {(control) => (
                <Input
                  {...control}
                  type="date"
                  value={deliveredDate}
                  onChange={(event) => setDeliveredDate(event.target.value)}
                />
              )}
            </Field>

            <Field label={t("tracking")}>
              {(control) => (
                <Input
                  {...control}
                  value={trackingNumber}
                  maxLength={200}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                />
              )}
            </Field>

            <Field label={t("manifest")} hint={t("manifestHint")}>
              {(control) => (
                <Input
                  {...control}
                  value={manifestNumber}
                  maxLength={100}
                  onChange={(event) => setManifestNumber(event.target.value)}
                />
              )}
            </Field>

            <Field
              label={t("licence")}
              hint={
                organization?.licenceNumber
                  ? t("licenceDefault", { licence: organization.licenceNumber })
                  : t("licenceHint")
              }
            >
              {(control) => (
                <Input
                  {...control}
                  value={licenceNumber}
                  maxLength={100}
                  onChange={(event) => setLicenceNumber(event.target.value)}
                />
              )}
            </Field>

            <Field label={t("address")} hint={t("addressHint")}>
              {(control) => (
                <Input
                  {...control}
                  value={address}
                  maxLength={1000}
                  onChange={(event) => setAddress(event.target.value)}
                />
              )}
            </Field>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader title={t("linesTitle")} description={t("linesHint")} />
        <PanelBody className="space-y-5">
          {outbound ? (
            <UnitPicker<ShippableUnit>
              endpoint="/api/shipments/unit-options"
              label={t("pickUnit")}
              hint={t("pickUnitHint")}
              renderMeta={(unit) => unit.cultivarName ?? unit.locationName}
              onPick={addUnitLine}
            />
          ) : null}

          <ol className="space-y-4">
            {lines.map((line, index) => {
              const weighed = isWeightBased(line.materialType);
              const problem = problems[line.key];
              return (
                <li
                  key={line.key}
                  className="space-y-3 rounded-lg border border-border bg-sunken p-4"
                  aria-label={t("lineLabel", { number: index + 1 })}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-fg">
                      {t("lineLabel", { number: index + 1 })}
                      {line.unitName ? (
                        <span className="ms-2 font-normal text-fg-secondary">
                          {t("lineUnit", { name: line.unitName })}
                        </span>
                      ) : null}
                    </h3>
                    <IconButton
                      label={t("removeLine", { number: index + 1 })}
                      variant="ghost"
                      size="sm"
                      disabled={lines.length === 1}
                      onClick={() =>
                        setLines((previous) => previous.filter((l) => l.key !== line.key))
                      }
                    >
                      <Trash2 />
                    </IconButton>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Field
                      label={t("lineDescription")}
                      error={problemText(problem, "description")}
                      className="lg:col-span-2"
                      required
                    >
                      {(control) => (
                        <Input
                          {...control}
                          value={line.description}
                          maxLength={300}
                          onChange={(event) =>
                            patchLine(line.key, { description: event.target.value })
                          }
                        />
                      )}
                    </Field>

                    <Field label={t("lineMaterial")}>
                      {(control) => (
                        <Select
                          {...control}
                          value={line.materialType}
                          onChange={(event) =>
                            patchLine(line.key, { materialType: event.target.value })
                          }
                        >
                          {MATERIAL_CLASSES.map((material) => (
                            <option key={material.id} value={material.id}>
                              {domain(`materialClass.${material.id}`)}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>

                    {weighed ? (
                      <>
                        <Field
                          label={t("lineWeight")}
                          error={problemText(problem, "weightMissing", "negative")}
                          required
                        >
                          {(control) => (
                            <Input
                              {...control}
                              type="number"
                              inputMode="decimal"
                              step="0.001"
                              min="0"
                              value={line.weightGrams}
                              onChange={(event) =>
                                patchLine(line.key, { weightGrams: event.target.value })
                              }
                            />
                          )}
                        </Field>
                        <Field
                          label={t("lineBasis")}
                          error={problemText(problem, "basisMissing")}
                          required
                        >
                          {(control) => (
                            <Select
                              {...control}
                              value={line.moisture}
                              onChange={(event) =>
                                patchLine(line.key, { moisture: event.target.value })
                              }
                            >
                              <option value="">{t("lineBasisPlaceholder")}</option>
                              <option value="WET">{domain("moisture.WET")}</option>
                              <option value="DRY">{domain("moisture.DRY")}</option>
                            </Select>
                          )}
                        </Field>
                      </>
                    ) : (
                      <Field
                        label={t("lineCount")}
                        error={problemText(problem, "countMissing", "countNotWhole", "negative")}
                        required
                      >
                        {(control) => (
                          <Input
                            {...control}
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="0"
                            value={line.unitCount}
                            onChange={(event) =>
                              patchLine(line.key, { unitCount: event.target.value })
                            }
                          />
                        )}
                      </Field>
                    )}

                    <Field label={t("lineCultivar")}>
                      {(control) => (
                        <Select
                          {...control}
                          value={line.cultivarId}
                          onChange={(event) =>
                            patchLine(line.key, { cultivarId: event.target.value })
                          }
                        >
                          <option value="">{domain("empty")}</option>
                          {cultivars.map((cultivar) => (
                            <option key={cultivar.id} value={cultivar.id}>
                              {cultivar.name}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>

                    <Field label={t("lineComment")} className="sm:col-span-2">
                      {(control) => (
                        <Input
                          {...control}
                          value={line.comment}
                          maxLength={1000}
                          onChange={(event) => patchLine(line.key, { comment: event.target.value })}
                        />
                      )}
                    </Field>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="secondary"
              onClick={() => setLines((previous) => [...previous, emptyLine(nextKey())])}
            >
              {t("addLine")}
            </Button>
            <p className="text-sm">
              <span className="text-fg-secondary">{t("manifestTotal")} </span>
              <span className="font-medium">
                <MaterialTotalsText totals={totals} />
              </span>
            </p>
          </div>
        </PanelBody>
      </Panel>

      <Panel>
        <PanelBody>
          <Field label={t("notes")} hint={t("notesHint")}>
            {(control) => (
              <Textarea
                {...control}
                rows={3}
                value={comment}
                maxLength={2000}
                onChange={(event) => setComment(event.target.value)}
              />
            )}
          </Field>
        </PanelBody>
      </Panel>

      {submitted && (headerErrors.organization || Object.keys(problems).length > 0) ? (
        <Banner tone="danger">{t("fixErrors")}</Banner>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Button href="/inventory/materials" variant="secondary">
          {t("cancel")}
        </Button>
        <Button type="submit" variant="primary" loading={saving}>
          {t("submit")}
        </Button>
      </div>
    </form>
  );
}
