import { useFormatter, useTranslations } from "next-intl";
import { EntityLink } from "@/components/page/EntityLink";
import { HoldBadge, SeverityBadge, VerdictBadge } from "@/components/page/domain-badges";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { ActionButton } from "@/components/unit/UnitActions";
import { Stamp, When, linkClass } from "@/components/unit/common";
import { Link } from "@/i18n/navigation";
import type {
  UnitHoldView,
  UnitIncidentView,
  UnitQuality,
  UnitTestView,
} from "@/features/unit/queries";

/**
 * Quality tab: lab results (the verdict is computed by the server from the value and the limits),
 * incidents, and every quality hold the unit has had with who placed and who released it.
 */
export function UnitQaPanels({ quality }: { quality: UnitQuality }) {
  return (
    <div className="space-y-6">
      <TestsTable tests={quality.tests} />
      <IncidentsTable incidents={quality.incidents} />
      <HoldHistory holds={quality.holds} />
    </div>
  );
}

function TestsTable({ tests }: { tests: UnitTestView[] }) {
  const t = useTranslations("units.panels.tests");
  const domain = useTranslations("domain");
  const format = useFormatter();

  const columns: Array<Column<UnitTestView>> = [
    {
      id: "tested",
      header: t("columns.tested"),
      rowHeader: true,
      cell: (test) => <Stamp who={test.recordedBy} whoId={test.recordedById} at={test.testedAt} />,
    },
    {
      id: "test",
      header: t("columns.test"),
      cell: (test) => (
        <span className="flex flex-col">
          <Link href={`/quality?view=tests&verdict=${test.verdict}`} className={linkClass}>
            {test.analyte}
          </Link>
          <span className="text-fg-secondary">{domain(`testPanel.${test.panel}`)}</span>
        </span>
      ),
    },
    {
      id: "result",
      header: t("columns.result"),
      cell: (test) =>
        test.value !== null
          ? `${format.number(test.value)}${test.uom ? ` ${test.uom}` : ""}`
          : t("noNumber"),
    },
    {
      id: "limits",
      header: t("columns.limits"),
      cell: (test) => {
        if (test.limitMin === null && test.limitMax === null) return domain("empty");
        if (test.limitMin !== null && test.limitMax !== null) {
          return t("between", {
            min: format.number(test.limitMin),
            max: format.number(test.limitMax),
          });
        }
        return test.limitMin !== null
          ? t("atLeast", { value: format.number(test.limitMin) })
          : t("atMost", { value: format.number(test.limitMax ?? 0) });
      },
    },
    {
      id: "verdict",
      header: t("columns.verdict"),
      cell: (test) => <VerdictBadge verdict={test.verdict} />,
    },
    {
      id: "lab",
      header: t("columns.lab"),
      cell: (test) => (
        <span className="flex flex-col">
          <EntityLink kind="organization" id={test.labId}>
            {test.labName ?? domain("empty")}
          </EntityLink>
          {test.comment ? <span className="text-fg-secondary">{test.comment}</span> : null}
        </span>
      ),
    },
  ];

  return (
    <Panel>
      <PanelHeader
        title={t("title")}
        description={t("description")}
        actions={<ActionButton action="recordTest" />}
      />
      <PanelBody>
        <DataTable
          caption={t("caption")}
          captionHidden
          columns={columns}
          rows={tests}
          rowKey={(test) => test.id}
          density="compact"
          empty={<p className="text-fg-secondary">{t("empty")}</p>}
        />
      </PanelBody>
    </Panel>
  );
}

function IncidentsTable({ incidents }: { incidents: UnitIncidentView[] }) {
  const t = useTranslations("units.panels.incidents");
  const domain = useTranslations("domain");

  const columns: Array<Column<UnitIncidentView>> = [
    {
      id: "opened",
      header: t("columns.opened"),
      rowHeader: true,
      cell: (incident) => (
        <Stamp who={incident.openedBy} whoId={incident.openedById} at={incident.openedAt} />
      ),
    },
    {
      id: "severity",
      header: t("columns.severity"),
      cell: (incident) => <SeverityBadge severity={incident.severity} />,
    },
    {
      id: "incident",
      header: t("columns.incident"),
      cell: (incident) => (
        <span className="flex max-w-prose flex-col">
          <Link href="/quality?view=incidents" className={`${linkClass} font-medium`}>
            {incident.title}
          </Link>
          <span className="text-fg-secondary">{incident.description}</span>
          {incident.resolution ? (
            <span className="text-fg-secondary">
              <span className="font-medium">{t("resolution")}</span> {incident.resolution}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "status",
      header: t("columns.status"),
      cell: (incident) => (
        <span className="flex flex-col items-start gap-1">
          <Badge
            tone={incident.status === "CLOSED" ? "success" : "warning"}
            href="/quality?view=incidents"
          >
            {domain(`incidentStatus.${incident.status}`)}
          </Badge>
          {incident.closedAt ? (
            <When value={incident.closedAt} className="text-fg-secondary" />
          ) : null}
        </span>
      ),
    },
  ];

  return (
    <Panel>
      <PanelHeader
        title={t("title")}
        description={t("description")}
        actions={<ActionButton action="reportIncident" />}
      />
      <PanelBody>
        <DataTable
          caption={t("caption")}
          captionHidden
          columns={columns}
          rows={incidents}
          rowKey={(incident) => incident.id}
          density="compact"
          empty={<p className="text-fg-secondary">{t("empty")}</p>}
        />
      </PanelBody>
    </Panel>
  );
}

function HoldHistory({ holds }: { holds: UnitHoldView[] }) {
  const t = useTranslations("units.panels.holds");
  const domain = useTranslations("domain");

  const columns: Array<Column<UnitHoldView>> = [
    {
      id: "placed",
      header: t("columns.placed"),
      rowHeader: true,
      cell: (hold) => <Stamp who={hold.placedBy} whoId={hold.placedById} at={hold.placedAt} />,
    },
    {
      id: "kind",
      header: t("columns.kind"),
      cell: (hold) => (
        <span className="flex flex-col items-start gap-1">
          <HoldBadge kind={hold.kind} />
          <span className="text-fg-secondary">{domain(`holdOrigin.${hold.origin}`)}</span>
        </span>
      ),
    },
    {
      id: "reason",
      header: t("columns.reason"),
      cell: (hold) => <span className="max-w-prose">{hold.reason}</span>,
    },
    {
      id: "released",
      header: t("columns.released"),
      cell: (hold) =>
        hold.releasedAt ? (
          <span className="flex flex-col">
            <Stamp who={hold.releasedBy} at={hold.releasedAt} />
            {hold.releaseNote ? (
              <span className="text-fg-secondary">{hold.releaseNote}</span>
            ) : null}
          </span>
        ) : (
          <Badge tone="warning">{t("active")}</Badge>
        ),
    },
  ];

  return (
    <Panel>
      <PanelHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <ActionButton action="hold" />
            <ActionButton action="releaseHold" variant="primary" />
          </>
        }
      />
      <PanelBody>
        <DataTable
          caption={t("caption")}
          captionHidden
          columns={columns}
          rows={holds}
          rowKey={(hold) => hold.id}
          density="compact"
          empty={<p className="text-fg-secondary">{t("empty")}</p>}
        />
      </PanelBody>
    </Panel>
  );
}
