export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormatter, getTranslations } from "next-intl/server";
import { MemberRowActions } from "@/components/MemberRowActions";
import { MemberStatusBadge } from "@/components/page/domain-badges";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { EntityLink } from "@/components/page/EntityLink";
import { ExperimentStatusBadge } from "@/components/experiment/ExperimentStatusBadge";
import { HubCrumbs } from "@/components/shell/HubCrumbs";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { getMemberDetail, type MemberDetail } from "@/features/member/queries";
import { resolveRequestLocale } from "@/i18n/locale";
import { Link } from "@/i18n/navigation";
import { isAdmin, requirePageUser } from "@/lib/auth";
import { getExperimentStatus } from "@/lib/lab";
import { pseudonymNumber } from "@/lib/invites";
import { positiveIntParam } from "@/lib/list-params";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const t = await getTranslations("members.detail");
  const { id } = await params;
  return { title: t("pageTitle", { id }) };
}

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  await resolveRequestLocale(params);
  const viewer = await requirePageUser();
  const { id: rawId } = await params;
  const id = positiveIntParam(rawId);
  if (!id) notFound();

  const member = await getMemberDetail(viewer, id);
  if (!member) notFound();

  const t = await getTranslations("members");
  const domain = await getTranslations("domain");
  const common = await getTranslations("common");
  const format = await getFormatter();
  const canManage = isAdmin(viewer);

  const erased = pseudonymNumber(member.name) !== null;
  const number = pseudonymNumber(member.name);
  const name = number ? t("list.pseudonym", { number }) : member.name;
  const yesNo = (value: boolean) => common(value ? "yes" : "no");

  const experimentColumns: Array<Column<MemberDetail["experiments"][number]>> = [
    {
      id: "code",
      header: t("detail.experiments.columns.code"),
      rowHeader: true,
      cell: (e) => (
        <Link
          href={`/inventory/experiments/${e.id}`}
          className="font-mono text-accent-text hover:underline"
        >
          {e.ecode}
        </Link>
      ),
    },
    {
      id: "name",
      header: t("detail.experiments.columns.name"),
      cell: (e) => (
        <EntityLink kind="experiment" id={e.id}>
          {e.name}
        </EntityLink>
      ),
    },
    {
      id: "role",
      header: t("detail.experiments.columns.role"),
      cell: (e) => domain(`experimentRole.${e.role}`),
    },
    {
      id: "status",
      header: t("detail.experiments.columns.status"),
      cell: (e) => <ExperimentStatusBadge status={getExperimentStatus(e.endDate)} />,
    },
    {
      id: "units",
      header: t("detail.experiments.columns.units"),
      align: "end",
      cell: (e) => (
        <Link
          href={`/inventory/experiments/${e.id}`}
          className="text-accent-text tabular-nums hover:underline"
        >
          {format.number(e.units, "count")}
        </Link>
      ),
    },
  ];

  const date = (value: Date | null) =>
    value ? format.dateTime(value, "dateTime") : domain("empty");

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={<HubCrumbs tab="members" current={name} />}
        title={name}
        description={t("detail.description", { role: domain(`role.${member.access}`) })}
        actions={
          canManage ? (
            <MemberRowActions
              variant="button"
              afterRemoveHref="/records/members"
              isSelf={member.id === viewer.id}
              member={{
                id: member.id,
                name: member.name,
                displayName: name,
                email: member.admin?.email ?? null,
                status: member.status,
                erased,
              }}
            />
          ) : undefined
        }
        className="pb-0"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title={t("detail.profile.title")} />
          <PanelBody>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-fg-secondary">{t("detail.profile.role")}</dt>
                <dd className="mt-0.5">
                  <Link
                    href={`/records/members?access=${member.access}`}
                    className="text-accent-text hover:underline"
                  >
                    {domain(`role.${member.access}`)}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-fg-secondary">{t("detail.profile.status")}</dt>
                <dd className="mt-0.5 flex flex-wrap items-center gap-1.5">
                  <MemberStatusBadge status={member.status} />
                  {member.inviteExpired ? (
                    <Badge tone="warning">{t("list.inviteExpired")}</Badge>
                  ) : null}
                  {erased ? <Badge tone="neutral">{t("detail.profile.erased")}</Badge> : null}
                </dd>
              </div>
              {member.admin ? (
                <>
                  <div>
                    <dt className="text-fg-secondary">{t("detail.profile.email")}</dt>
                    <dd className="mt-0.5 break-all">
                      {member.admin.email ? (
                        <a
                          href={`mailto:${member.admin.email}`}
                          className="text-accent-text hover:underline"
                        >
                          {member.admin.email}
                        </a>
                      ) : (
                        domain("empty")
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-fg-secondary">{t("detail.profile.created")}</dt>
                    <dd className="mt-0.5">{date(member.admin.createdAt)}</dd>
                  </div>
                  {member.status === "invited" ? (
                    <div>
                      <dt className="text-fg-secondary">{t("detail.profile.inviteExpires")}</dt>
                      <dd className="mt-0.5">{date(member.admin.inviteExpiresAt)}</dd>
                    </div>
                  ) : null}
                </>
              ) : null}
            </dl>
          </PanelBody>
        </Panel>

        {member.security ? (
          <Panel>
            <PanelHeader
              title={t("detail.security.title")}
              description={t("detail.security.description")}
            />
            <PanelBody>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-fg-secondary">{t("detail.security.mfa")}</dt>
                  <dd className="mt-0.5">
                    <Badge tone={member.security.mfaEnabled ? "success" : "neutral"}>
                      {yesNo(member.security.mfaEnabled)}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-secondary">{t("detail.security.sessions")}</dt>
                  <dd className="mt-0.5 tabular-nums">
                    {format.number(member.security.activeSessions, "count")}
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-secondary">{t("detail.security.lastLogin")}</dt>
                  <dd className="mt-0.5">{date(member.security.lastLoginAt)}</dd>
                </div>
                <div>
                  <dt className="text-fg-secondary">{t("detail.security.passwordChanged")}</dt>
                  <dd className="mt-0.5">{date(member.security.passwordChangedAt)}</dd>
                </div>
              </dl>
            </PanelBody>
          </Panel>
        ) : null}
      </div>

      <section aria-labelledby="member-experiments">
        <h2 id="member-experiments" className="mb-3 text-lg font-semibold">
          {t("detail.experiments.title", { count: member.experiments.length })}
        </h2>
        <DataTable
          caption={t("detail.experiments.caption")}
          captionHidden
          columns={experimentColumns}
          rows={member.experiments}
          rowKey={(e) => e.id}
          empty={
            <EmptyState
              title={t("detail.experiments.emptyTitle")}
              description={t("detail.experiments.emptyBody")}
              headingLevel={3}
            />
          }
        />
      </section>

      {member.activity ? (
        <Panel>
          <PanelHeader
            title={t("detail.activity.title")}
            description={t("detail.activity.description")}
          />
          <PanelBody>
            {member.activity.length === 0 ? (
              <p className="text-sm text-fg-secondary">{t("detail.activity.none")}</p>
            ) : (
              <ul className="divide-y divide-border text-sm">
                {member.activity.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0"
                  >
                    <Link
                      href={`/compliance/audit?actor=${member.id}`}
                      className="text-accent-text hover:underline"
                    >
                      {entry.summary}
                    </Link>
                    <time dateTime={entry.createdAt.toISOString()} className="text-fg-secondary">
                      {format.dateTime(entry.createdAt, "dateTime")}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </PanelBody>
        </Panel>
      ) : null}
    </div>
  );
}
