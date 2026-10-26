export const dynamic = "force-dynamic";

import { CalendarDays, FlaskConical, Mail, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import { getFormatter, getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/ProfileForm";
import { SecuritySettings } from "@/components/SecuritySettings";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { getProfileSummary } from "@/features/auth/queries";
import { getMemberDetail } from "@/features/member/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { requirePageUser } from "@/lib/auth";
import { normalizeCodePrefix } from "@/lib/experiment-codes";
import { initialsOf } from "@/lib/initials";
import { env } from "@/server/env";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("profile");
  return { title: t("pageTitle") };
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  await resolveRequestLocale(params);
  const user = await requirePageUser();
  const t = await getTranslations("profile");
  const shell = await getTranslations("shell.user");
  const domain = await getTranslations("domain");
  const format = await getFormatter();

  const [summary, detail] = await Promise.all([
    getProfileSummary(user.id),
    getMemberDetail(user, user.id),
  ]);
  const initials = normalizeCodePrefix(summary.initials, user.name);
  const isAdmin = user.permissions === "ADMIN";
  const experiments = detail?.experiments ?? [];
  const activity = detail?.activity ?? [];
  const lastSignIn = detail?.security?.lastLoginAt ?? null;
  const passwordChanged = detail?.security?.passwordChangedAt ?? null;

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("subtitle")} className="pb-0" />

      <Panel className="overflow-hidden">
        <div aria-hidden="true" className="dot-grid h-20 border-b border-border bg-sunken/60" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="-mt-10 flex flex-wrap items-end gap-x-6 gap-y-4">
            <span
              aria-hidden="true"
              className="flex size-20 shrink-0 items-center justify-center rounded-full border-4 border-surface bg-accent text-2xl font-semibold text-on-accent"
            >
              {initialsOf(user.name)}
            </span>
            <div className="min-w-0 flex-1 basis-64 pb-1">
              <h2 className="text-2xl font-semibold tracking-[-0.02em] text-fg wrap-break-word">
                {user.name}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge tone="accent" href={`/records/members?access=${user.permissions}`}>
                  {isAdmin ? shell("roleAdmin") : shell("roleMember")}
                </Badge>
                <Badge tone="success" href="/records/members?status=active">
                  {domain("memberStatus.active")}
                </Badge>
                {summary.email ? (
                  <span className="inline-flex items-center gap-1.5 text-sm text-fg-secondary">
                    <Mail aria-hidden="true" className="size-4" />
                    <a
                      href={`mailto:${summary.email}`}
                      className="text-accent-text hover:underline"
                    >
                      {summary.email}
                    </a>
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <dl className="mt-6 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            <HeroStat
              icon={FlaskConical}
              label={t("hero.experiments")}
              value={format.number(experiments.length, "count")}
              href="/inventory/experiments?mine=1"
            />
            <HeroStat
              icon={CalendarDays}
              label={t("hero.lastSignIn")}
              value={lastSignIn ? format.dateTime(lastSignIn, "dateTime") : t("hero.never")}
              href={`/compliance/audit?actor=${user.id}`}
            />
            <HeroStat
              icon={CalendarDays}
              label={t("hero.memberSince")}
              value={format.dateTime(summary.memberSince, "date")}
              href={`/records/members/${user.id}`}
            />
          </dl>
        </div>
      </Panel>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ProfileForm currentName={user.name} currentInitials={initials} />
          <SecuritySettings
            mfaEnabled={summary.mfaEnabled}
            mfaRequired={isAdmin && env().REQUIRE_ADMIN_MFA}
          />
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title={t("account.title")} headingLevel={3} />
            <dl className="divide-y divide-border text-sm">
              <AccountRow
                label={t("account.access")}
                value={isAdmin ? shell("roleAdmin") : shell("roleMember")}
                href={`/records/members?access=${user.permissions}`}
              />
              <AccountRow
                label={t("account.status")}
                value={domain("memberStatus.active")}
                href="/records/members?status=active"
              />
              <AccountRow
                label={t("account.twoStep")}
                value={summary.mfaEnabled ? t("account.on") : t("account.off")}
                href="#security-heading"
              />
              <AccountRow
                label={t("account.passwordChanged")}
                value={passwordChanged ? format.dateTime(passwordChanged, "date") : t("hero.never")}
              />
            </dl>
          </Panel>

          <Panel>
            <PanelHeader
              title={t("experiments.title")}
              description={t("experiments.description")}
              headingLevel={3}
            />
            {experiments.length === 0 ? (
              <p className="px-5 py-5 text-sm text-fg-secondary sm:px-6">
                {t("experiments.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {experiments.map((experiment) => (
                  <li key={experiment.id} className="px-5 py-3.5 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/inventory/experiments/${experiment.id}`}
                        className="min-w-0 text-sm font-medium text-accent-text hover:underline"
                      >
                        <span className="font-mono">{experiment.ecode}</span> {experiment.name}
                      </Link>
                      <Badge tone={experiment.role === "LEAD" ? "accent" : "neutral"}>
                        {domain(`experimentRole.${experiment.role}`)}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm">
                      <Link
                        href={`/inventory/experiments/${experiment.id}`}
                        className="text-fg-secondary hover:text-accent-text hover:underline"
                      >
                        {t("experiments.units", { count: experiment.units })}
                      </Link>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {detail?.activity ? (
            <Panel>
              <PanelHeader
                title={t("activity.title")}
                description={t("activity.description")}
                headingLevel={3}
              />
              {activity.length === 0 ? (
                <p className="px-5 py-5 text-sm text-fg-secondary sm:px-6">{t("activity.empty")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {activity.map((entry) => (
                    <li key={entry.id} className="px-5 py-3.5 sm:px-6">
                      <Link
                        href={`/compliance/audit?actor=${user.id}`}
                        className="text-sm text-fg hover:text-accent-text hover:underline"
                      >
                        {entry.summary}
                      </Link>
                      <p className="mt-0.5 text-xs text-fg-secondary">
                        <time dateTime={entry.createdAt.toISOString()}>
                          {format.dateTime(entry.createdAt, "dateTime")}
                        </time>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  href: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-surface px-4 py-3.5">
      <Icon aria-hidden="true" className="size-5 shrink-0 text-fg-tertiary" />
      <div className="min-w-0">
        <dt className="text-xs text-fg-secondary">{label}</dt>
        <dd className="text-sm font-semibold tabular-nums">
          <Link href={href} className="text-fg hover:text-accent-text hover:underline">
            {value}
          </Link>
        </dd>
      </div>
    </div>
  );
}

function AccountRow({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6">
      <dt className="text-fg-secondary">{label}</dt>
      <dd className="text-end font-medium text-fg">
        {href ? (
          <Link href={href} className="text-accent-text hover:underline">
            {value}
          </Link>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
