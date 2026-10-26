"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/FormControls";
import { Panel } from "@/components/ui/Panel";
import { useRouter } from "@/i18n/navigation";
import { useApiError, useNetworkError } from "@/lib/api-error";
import { sendJson } from "@/lib/client-api";
import { MIN_PASSWORD_LENGTH } from "@/lib/password-rules";

export function ProfileForm({
  currentName,
  currentInitials,
}: {
  currentName: string;
  currentInitials: string;
}) {
  const t = useTranslations("profile");
  const router = useRouter();
  const describe = useApiError();
  const networkMessage = useNetworkError();

  const [name, setName] = useState(currentName);
  const [initials, setInitials] = useState(currentInitials);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ current?: string; confirm?: string }>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const nextInitials = initials
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 4);
    const errors: typeof fieldErrors = {};
    if (!currentPassword) errors.current = t("needCurrent");
    if (newPassword && newPassword !== confirmPassword) errors.confirm = t("mismatch");
    setFieldErrors(errors);
    if (errors.current || errors.confirm) return;

    setLoading(true);
    const result = await sendJson<{ unchanged?: boolean }>(
      "/api/auth/profile",
      {
        currentPassword,
        name: name.trim() !== currentName ? name.trim() : undefined,
        initials: nextInitials !== currentInitials ? nextInitials : undefined,
        newPassword: newPassword || undefined,
      },
      "PATCH"
    );
    setLoading(false);
    if (!result.ok) return setError(result.network ? networkMessage : describe(result.error));

    setSuccess(result.data.unchanged ? t("unchanged") : t("saved"));
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <Panel className="divide-y divide-border">
        <FormSection
          title={t("sections.personal.title")}
          description={t("sections.personal.description")}
        >
          <Field label={t("username")} required>
            {(control) => (
              <Input
                {...control}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="username"
              />
            )}
          </Field>

          <Field label={t("prefix")} hint={t("prefixHelp", { example: initials || "XX" })}>
            {(control) => (
              <Input
                {...control}
                className="font-mono"
                value={initials}
                onChange={(e) =>
                  setInitials(
                    e.target.value
                      .replace(/[^A-Za-z]/g, "")
                      .toUpperCase()
                      .slice(0, 4)
                  )
                }
                maxLength={4}
                placeholder={t("prefixPlaceholder")}
              />
            )}
          </Field>
        </FormSection>

        <FormSection
          title={t("sections.password.title")}
          description={t("sections.password.description")}
        >
          <Field label={t("newPassword")} hint={t("passwordRules", { min: MIN_PASSWORD_LENGTH })}>
            {(control) => (
              <Input
                {...control}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            )}
          </Field>
          <Field label={t("confirmNewPassword")} error={fieldErrors.confirm}>
            {(control) => (
              <Input
                {...control}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            )}
          </Field>
        </FormSection>

        <FormSection
          title={t("sections.confirm.title")}
          description={t("sections.confirm.description")}
        >
          <Field label={t("currentPassword")} error={fieldErrors.current} required>
            {(control) => (
              <Input
                {...control}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                placeholder={t("currentPasswordPlaceholder")}
              />
            )}
          </Field>
        </FormSection>

        <div className="flex flex-wrap items-center justify-between gap-4 bg-sunken/50 px-5 py-4 sm:px-6">
          <div aria-live="polite" className="min-w-0 flex-1 basis-64 space-y-2">
            {error ? <Banner tone="danger">{error}</Banner> : null}
            {success ? <Banner tone="success">{success}</Banner> : null}
          </div>
          <Button type="submit" variant="primary" loading={loading}>
            {loading ? t("saving") : t("save")}
          </Button>
        </div>
      </Panel>
    </form>
  );
}

/** One block of the settings form: what it is on the left, its fields on the right. */
function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-5 px-5 py-6 sm:px-6 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-8">
      <div>
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        <p className="mt-1 text-sm text-pretty text-fg-secondary">{description}</p>
      </div>
      <div className="max-w-lg space-y-5">{children}</div>
    </section>
  );
}
