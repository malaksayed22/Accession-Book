"use client";

import { Laptop, ShieldAlert, ShieldCheck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { MfaEnrol } from "@/components/MfaEnrol";
import { Badge } from "@/components/ui/Badge";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/FormControls";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { useRouter } from "@/i18n/navigation";
import { useApiError, useNetworkError } from "@/lib/api-error";
import { sendJson } from "@/lib/client-api";

type SessionRow = {
  id: number;
  lastSeenAt: string;
  ip: string | null;
  userAgent: string | null;
  current: boolean;
};

/** Two-step verification and active-session controls for the signed-in user. */
export function SecuritySettings({
  mfaEnabled,
  mfaRequired,
}: {
  mfaEnabled: boolean;
  /** True for roles where two-step cannot be turned off. */
  mfaRequired: boolean;
}) {
  const t = useTranslations("profile.security");
  const auth = useTranslations("auth.mfa");
  const format = useFormatter();
  const router = useRouter();
  const describe = useApiError();
  const networkMessage = useNetworkError();

  const [enrolling, setEnrolling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  const loadSessions = useCallback(async () => {
    const response = await fetch("/api/auth/sessions").catch(() => null);
    if (response?.ok) setSessions((await response.json()).sessions ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    void loadSessions();
  }, [loadSessions]);

  async function disable(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const result = await sendJson("/api/auth/mfa/disable", { password, code });
    if (!result.ok) return setError(result.network ? networkMessage : describe(result.error));
    setDisabling(false);
    setPassword("");
    setCode("");
    router.refresh();
  }

  async function endSession(id: number) {
    await sendJson(`/api/auth/sessions/${id}`, undefined, "DELETE");
    await loadSessions();
  }

  return (
    <Panel aria-labelledby="security-heading">
      <PanelHeader
        title={<span id="security-heading">{t("title")}</span>}
        description={t("description")}
        actions={
          <Badge
            tone={mfaEnabled ? "success" : "warning"}
            icon={mfaEnabled ? <ShieldCheck /> : <ShieldAlert />}
          >
            {mfaEnabled ? t("statusOn") : t("statusOff")}
          </Badge>
        }
      />

      <div className="space-y-5 border-b border-border px-5 py-5 sm:px-6">
        {enrolling ? (
          <MfaEnrol
            onDone={() => {
              setEnrolling(false);
              router.refresh();
            }}
          />
        ) : mfaEnabled ? (
          <div className="max-w-lg space-y-3 text-sm">
            <p className="text-fg">{t("mfaOn")}</p>
            {mfaRequired ? (
              <p className="text-fg-secondary">{t("mfaRequiredForRole")}</p>
            ) : disabling ? (
              <form onSubmit={disable} className="space-y-3">
                <Field label={t("currentPassword")} required>
                  {(control) => (
                    <Input
                      {...control}
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  )}
                </Field>
                <Field label={t("code")} hint={auth("help")} required>
                  {(control) => (
                    <Input
                      {...control}
                      autoComplete="one-time-code"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  )}
                </Field>
                <Button type="submit" variant="danger">
                  {t("turnOff")}
                </Button>
              </form>
            ) : (
              <Button variant="secondary" onClick={() => setDisabling(true)}>
                {t("turnOffStart")}
              </Button>
            )}
          </div>
        ) : (
          <div className="max-w-lg space-y-3 text-sm">
            <p className="text-fg-secondary">{t("mfaOff")}</p>
            <Button variant="primary" onClick={() => setEnrolling(true)}>
              {t("setUp")}
            </Button>
          </div>
        )}

        <div aria-live="polite">{error ? <Banner tone="danger">{error}</Banner> : null}</div>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <h3 className="text-base font-semibold text-fg">{t("sessionsTitle")}</h3>
        <p className="mt-1 text-sm text-fg-secondary">{t("sessionsDescription")}</p>
        <ul className="mt-4 space-y-2 text-sm">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-sunken/50 px-4 py-3"
            >
              <Laptop aria-hidden className="size-5 shrink-0 text-fg-tertiary" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-fg">
                  {s.userAgent ?? t("unknownDevice")}
                </span>
                <span className="text-xs text-fg-secondary">
                  {s.ip ?? t("unknownAddress")} ·{" "}
                  {format.dateTime(new Date(s.lastSeenAt), "dateTime")}
                </span>
              </span>
              {s.current ? (
                <Badge tone="accent">{t("thisDevice")}</Badge>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => endSession(s.id)}>
                  {t("endSession")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
