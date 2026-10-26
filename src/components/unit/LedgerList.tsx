import { Download } from "lucide-react";
import type { ReactNode } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { EntityLink, type EntityKind } from "@/components/page/EntityLink";
import { richValue } from "@/components/page/rich-value";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Link } from "@/i18n/navigation";
import type { LedgerEvent, LedgerEventType } from "@/lib/ledger-types";
import { When, linkClass } from "./common";

/** Most recent events shown on the page; the audit report lists every one. */
export const LEDGER_PAGE_LIMIT = 200;

type Props = { events: LedgerEvent[]; exportHref: string };

const TYPE_TONE: Partial<Record<LedgerEventType, "warning" | "danger" | "info" | "accent">> = {
  HOLD_PLACED: "warning",
  HOLD_RELEASED: "info",
  DESTROYED: "danger",
  SHIPPED: "info",
  INCIDENT: "warning",
};

/**
 * The unit's history as who / what / when. Every row names the person who recorded it and the
 * instant it happened with its time zone; an entry filed later than it happened (back-dated) also
 * shows when it was filed. Events are immutable: a correction is a new row, never an edit.
 */
export function LedgerList({ events, exportHref }: Props) {
  const t = useTranslations("units.ledger");
  const domain = useTranslations("domain");
  const format = useFormatter();
  const shown = events.slice(0, LEDGER_PAGE_LIMIT);

  function describe(event: LedgerEvent): { headline: ReactNode; detail: ReactNode } {
    const f = event.facts;
    const none = domain("empty");
    const str = (key: string) => (typeof f[key] === "string" ? (f[key] as string) : null);
    const num = (key: string) => (typeof f[key] === "number" ? (f[key] as number) : null);
    // A row that is itself a link (event.href) must not hold another link, so names stay plain there.
    const named = (kind: EntityKind, id: number | null, text: ReactNode, key?: string) =>
      richValue(
        event.href ? (
          text
        ) : (
          <EntityLink kind={kind} id={id}>
            {text}
          </EntityLink>
        ),
        key
      );
    switch (event.type) {
      case "REGISTERED":
        return {
          headline: t("text.REGISTERED", {
            unitType: str("unitType") ? domain(`unitType.${str("unitType") as "PLANT"}`) : none,
            cultivar: str("cultivar") ?? none,
            experiment: str("experiment") ?? none,
            source: str("sourceType") ? domain(`sourceType.${str("sourceType") as "SEED"}`) : none,
          }),
          detail: null,
        };
      case "RECEIVED":
        return {
          headline: str("organization")
            ? t.rich("text.RECEIVED", {
                organization: named(
                  "organization",
                  num("organizationId"),
                  str("organization") as string
                ),
              })
            : t("text.RECEIVED_UNKNOWN"),
          detail: null,
        };
      case "SHIPPED":
        return {
          headline: str("organization")
            ? t.rich("text.SHIPPED", {
                organization: named(
                  "organization",
                  num("organizationId"),
                  str("organization") as string
                ),
              })
            : t("text.SHIPPED_UNKNOWN"),
          detail: null,
        };
      case "DERIVED_FROM":
        return {
          headline: t("text.DERIVED_FROM", { parent: str("parent") ?? none }),
          detail: null,
        };
      case "LINEAGE_LINKED":
        return {
          headline: t("text.LINEAGE_LINKED", { parent: str("parent") ?? none }),
          detail: null,
        };
      case "PRODUCED":
        return { headline: t("text.PRODUCED", { child: str("child") ?? none }), detail: null };
      case "MOVED":
        return {
          headline: t.rich("text.MOVED", {
            from: named("location", num("fromId"), str("from") ?? t("unlocated"), "from"),
            to: named("location", num("toId"), str("to") ?? t("unlocated"), "to"),
            scan: f.scanConfirmed ? "yes" : "no",
          }),
          detail: null,
        };
      case "STAGE_CHANGED":
        return {
          headline: t("text.STAGE_CHANGED", {
            from: str("from") ? domain(`growthStage.${str("from") as "SEED"}`) : none,
            to: str("to") ? domain(`growthStage.${str("to") as "SEED"}`) : none,
          }),
          detail: null,
        };
      case "MEASURED": {
        const parts = [
          typeof f.humid === "number"
            ? t("measure.humid", { value: format.number(f.humid, "grams") })
            : null,
          typeof f.dry === "number"
            ? t("measure.dry", { value: format.number(f.dry, "grams") })
            : null,
          typeof f.seeds === "number"
            ? t("measure.seeds", { value: format.number(f.seeds, "count") })
            : null,
        ].filter(Boolean);
        return {
          headline: t("text.MEASURED", { summary: parts.join(" · ") || none }),
          detail: null,
        };
      }
      case "DESTROYED":
        return {
          headline: t.rich("text.DESTROYED", {
            witness: named("member", num("witnessId"), str("witness") ?? none),
          }),
          detail: null,
        };
      case "HOLD_PLACED":
        return {
          headline: t("text.HOLD_PLACED", {
            kind: domain(`holdKind.${str("holdKind") as "HOLD"}`),
            origin: domain(`holdOrigin.${str("holdOrigin") as "MANUAL"}`),
          }),
          detail: null,
        };
      case "HOLD_RELEASED":
        return {
          headline: t("text.HOLD_RELEASED", {
            kind: domain(`holdKind.${str("holdKind") as "HOLD"}`),
          }),
          detail: null,
        };
      case "TEST": {
        const result =
          typeof f.value === "number"
            ? `${format.number(f.value)}${str("uom") ? ` ${str("uom")}` : ""}`
            : t("noNumber");
        return {
          headline: t("text.TEST", {
            panel: domain(`testPanel.${str("panel") as "POTENCY"}`),
            analyte: str("analyte") ?? none,
            result,
            verdict: domain(`testVerdict.${str("verdict") as "PASS"}`),
          }),
          detail: str("lab")
            ? t.rich("lab", {
                lab: named("organization", num("labId"), str("lab") as string),
              })
            : null,
        };
      }
      case "INCIDENT":
        return {
          headline: t("text.INCIDENT", {
            severity: domain(`incidentSeverity.${str("severity") as "MAJOR"}`),
            title: str("title") ?? none,
            status: domain(`incidentStatus.${str("incidentStatus") as "OPEN"}`),
          }),
          detail: null,
        };
      case "ACTIVITY":
        return {
          headline: t("text.ACTIVITY", {
            activityType: domain(`activityType.${str("activityType") as "TREATMENT"}`),
            title: str("title") ?? none,
          }),
          detail: null,
        };
      case "ATTACHMENT":
        return {
          headline: t("text.ATTACHMENT", {
            label: str("label") ?? none,
            category: domain(`attachmentCategory.${str("category") as "PHOTO"}`),
          }),
          detail: null,
        };
      case "SHIPMENT":
        return {
          headline: t("text.SHIPMENT", {
            reference: str("reference") ?? none,
            direction: domain(`shipmentDirection.${str("direction") as "OUTBOUND"}`),
            status: domain(`shipmentStatus.${str("shipmentStatus") as "DRAFT"}`),
          }),
          detail: null,
        };
      case "AUDIT": {
        const action = str("action") ?? "";
        const known = action === "update" || action === "void";
        return {
          headline: known ? t(`audit.${action}`) : t("audit.other"),
          detail: null,
        };
      }
    }
  }

  const columns: Array<Column<LedgerEvent>> = [
    {
      id: "when",
      header: t("columns.when"),
      cell: (event) => (
        <span className="flex flex-col">
          <When value={event.at} />
          {event.recordedAt ? (
            <span className="text-fg-secondary">
              {t("recordedLater")} <When value={event.recordedAt} />
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "type",
      header: t("columns.event"),
      cell: (event) => (
        <span className="flex flex-col items-start gap-1">
          <Badge tone={TYPE_TONE[event.type] ?? "neutral"}>{t(`types.${event.type}`)}</Badge>
          {event.sequence !== null ? (
            <span className="text-xs text-fg-secondary tabular-nums">
              {t("sequence", { number: event.sequence })}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "what",
      header: t("columns.what"),
      cell: (event) => {
        const { headline, detail } = describe(event);
        const label = event.href ? (
          <Link href={event.href} className={linkClass}>
            {headline}
          </Link>
        ) : (
          headline
        );
        return (
          <span className="flex max-w-prose flex-col gap-0.5">
            <span>{label}</span>
            {detail ? <span className="text-fg-secondary">{detail}</span> : null}
            {event.note ? (
              <span className="text-fg-secondary">
                <span className="font-medium">{t(`noteLabel.${event.type}`)}</span> {event.note}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      id: "who",
      header: t("columns.who"),
      cell: (event) =>
        event.actor ? (
          <EntityLink kind="member" id={event.actorId} className="font-normal">
            {event.actor}
          </EntityLink>
        ) : (
          domain("empty")
        ),
    },
  ];

  return (
    <Panel>
      <PanelHeader
        title={t("title")}
        description={t("description", { count: events.length })}
        actions={
          <Button href={exportHref} variant="secondary" icon={<Download />}>
            {t("export")}
          </Button>
        }
      />
      <PanelBody className="space-y-4">
        <p className="text-sm text-fg-secondary">{t("immutable")}</p>
        <DataTable
          caption={t("caption")}
          captionHidden
          columns={columns}
          rows={shown}
          rowKey={(event) => event.key}
          density="compact"
          empty={
            <EmptyState title={t("emptyTitle")} description={t("emptyBody")} headingLevel={3} />
          }
        />
        {events.length > shown.length ? (
          <p className="text-sm text-fg-secondary">
            {t("truncated", { shown: shown.length, total: events.length })}
          </p>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
