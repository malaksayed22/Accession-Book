"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Checkbox, Input, Select, Textarea } from "@/components/ui/FormControls";
import { Link } from "@/i18n/navigation";
import { Segmented } from "./Segmented";
import { SupplierRegistration } from "./SupplierRegistration";
import { checkCapacity, plannedUnits } from "./wizard-state";
import { MANIFEST_MAX, SOURCE_DESCRIPTION_MAX } from "./wizard-validation";
import type { StepProps } from "./step-props";
import { useIssueMessage } from "./use-issue-message";

/** Step 3: where the units are held, and where the material came from (provenance and receipt). */
export function SourceStep({
  state,
  dispatch,
  errors,
  options,
  onSupplierRegistered,
}: StepProps & { onSupplierRegistered: (organization: { id: number; name: string }) => void }) {
  const t = useTranslations("experiments.wizard.source");
  const message = useIssueMessage();
  const [registering, setRegistering] = useState(false);

  const total = plannedUnits(state);
  const hasUnits = total > 0;
  const external = state.providerMode === "EXTERNAL";
  const location = options.locations.find((l) => String(l.id) === state.locationId);
  const capacity = checkCapacity(location, total);

  return (
    <div className="space-y-5">
      {!hasUnits ? <Banner tone="info">{t("noUnits")}</Banner> : null}

      <Field
        label={t("location")}
        required={hasUnits}
        hint={t("locationHint")}
        error={message(errors.location)}
      >
        {(control) => (
          <Select
            name="locationId"
            value={state.locationId}
            onChange={(e) => dispatch({ type: "set", patch: { locationId: e.target.value } })}
            {...control}
          >
            <option value="">{t("chooseLocation")}</option>
            {options.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.capacity
                  ? t("locationWithCapacity", {
                      name: l.name,
                      occupancy: l.occupancy,
                      capacity: l.capacity,
                    })
                  : t("locationWithCount", { name: l.name, count: l.occupancy })}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {capacity.status === "exceeded" ? (
        <Banner tone="warning" title={t("capacity.exceededTitle")}>
          {t("capacity.exceeded", {
            name: location?.name ?? "",
            planned: capacity.projected,
            capacity: capacity.capacity,
            occupancy: capacity.occupancy,
          })}
        </Banner>
      ) : capacity.status === "full" ? (
        <Banner tone="info">
          {t("capacity.full", { name: location?.name ?? "", capacity: capacity.capacity })}
        </Banner>
      ) : capacity.status === "within" ? (
        <p className="text-sm text-fg-secondary" aria-live="polite">
          {t("capacity.within", {
            name: location?.name ?? "",
            projected: capacity.projected,
            capacity: capacity.capacity,
            remaining: capacity.capacity - capacity.projected,
          })}
        </p>
      ) : null}

      <Segmented
        legend={t("sourceMode")}
        name="provider-mode"
        value={state.providerMode}
        options={[
          { value: "INTERNAL", label: t("internal") },
          { value: "EXTERNAL", label: t("external") },
        ]}
        onChange={(mode) => dispatch({ type: "setProviderMode", mode })}
      />

      {external ? (
        <div className="space-y-4">
          <Field label={t("supplier")} required={hasUnits} error={message(errors.supplier)}>
            {(control) => (
              <Select
                name="providerId"
                value={state.providerId}
                onChange={(e) => dispatch({ type: "set", patch: { providerId: e.target.value } })}
                {...control}
              >
                <option value="">{t("chooseSupplier")}</option>
                {options.organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          {!state.providerId && !registering ? (
            options.user.admin ? (
              <Button variant="secondary" icon={<Plus />} onClick={() => setRegistering(true)}>
                {t("registerSupplier")}
              </Button>
            ) : (
              <p className="text-sm text-fg-secondary">
                {t("supplierMissingMember")}{" "}
                <Link
                  href="/records/organizations"
                  className="text-accent-text underline underline-offset-2"
                >
                  {t("browsePartners")}
                </Link>
              </p>
            )
          ) : null}

          {registering && options.user.admin ? (
            <SupplierRegistration
              onCancel={() => setRegistering(false)}
              onRegistered={(organization) => {
                onSupplierRegistered(organization);
                setRegistering(false);
              }}
            />
          ) : null}

          {hasUnits && state.providerId ? (
            <div className="space-y-3 rounded-xl border border-border bg-sunken p-4">
              <Checkbox
                label={t("createReceipt")}
                description={t("createReceiptHint")}
                checked={state.createReceipt}
                onChange={(e) =>
                  dispatch({ type: "set", patch: { createReceipt: e.target.checked } })
                }
              />
              {state.createReceipt ? (
                <Field
                  label={t("manifest")}
                  hint={t("manifestHint")}
                  error={message(errors.manifestNumber)}
                >
                  {(control) => (
                    <Input
                      name="manifestNumber"
                      value={state.manifestNumber}
                      maxLength={MANIFEST_MAX + 20}
                      autoComplete="off"
                      placeholder={t("manifestPlaceholder")}
                      onChange={(e) =>
                        dispatch({ type: "set", patch: { manifestNumber: e.target.value } })
                      }
                      {...control}
                    />
                  )}
                </Field>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <Field
          label={t("internalDescription")}
          required={hasUnits}
          hint={t("internalDescriptionHint")}
          error={message(errors.sourceDescription)}
        >
          {(control) => (
            <Textarea
              name="sourceDescription"
              rows={3}
              value={state.sourceDescription}
              maxLength={SOURCE_DESCRIPTION_MAX + 200}
              placeholder={t("internalDescriptionPlaceholder")}
              onChange={(e) =>
                dispatch({ type: "set", patch: { sourceDescription: e.target.value } })
              }
              {...control}
            />
          )}
        </Field>
      )}
    </div>
  );
}
