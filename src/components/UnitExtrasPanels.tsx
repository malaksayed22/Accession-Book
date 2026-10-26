import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { ActionButton } from "@/components/unit/UnitActions";
import { VoidDocumentButton } from "@/components/unit/VoidDocumentButton";
import { Stamp, linkClass } from "@/components/unit/common";
import type { UnitActivityView, UnitAttachmentView, UnitDocuments } from "@/features/unit/queries";

/** The number of hash characters shown; the full SHA-256 is in the audit report. */
const HASH_PREVIEW = 12;

/**
 * Documents and activity tab. A document's SHA-256 is recorded at upload so its integrity can be
 * checked later; removing one voids it with a reason and keeps the file as evidence.
 */
export function UnitExtrasPanels({
  unitId,
  documents,
  viewerId,
  canEdit,
  isAdmin,
  terminal,
}: {
  unitId: number;
  documents: UnitDocuments;
  viewerId: number;
  canEdit: boolean;
  isAdmin: boolean;
  terminal: boolean;
}) {
  return (
    <div className="space-y-6">
      <AttachmentsTable
        unitId={unitId}
        attachments={documents.attachments}
        mayVoid={(a) => isAdmin || (canEdit && !terminal && a.uploadedById === viewerId)}
      />
      <ActivitiesTable activities={documents.activities} />
    </div>
  );
}

function AttachmentsTable({
  unitId,
  attachments,
  mayVoid,
}: {
  unitId: number;
  attachments: UnitAttachmentView[];
  mayVoid: (attachment: UnitAttachmentView) => boolean;
}) {
  const t = useTranslations("units.panels.documents");
  const domain = useTranslations("domain");
  const format = useFormatter();

  const size = (bytes: number | null) => {
    if (bytes === null) return domain("empty");
    return bytes >= 1024 * 1024
      ? format.number(bytes / (1024 * 1024), {
          style: "unit",
          unit: "megabyte",
          maximumFractionDigits: 1,
        })
      : format.number(bytes / 1024, { style: "unit", unit: "kilobyte", maximumFractionDigits: 1 });
  };

  const columns: Array<Column<UnitAttachmentView>> = [
    {
      id: "document",
      header: t("columns.document"),
      rowHeader: true,
      cell: (a) => (
        <span className="flex flex-col">
          <a href={`/api/units/${unitId}/attachments/${a.id}`} className={linkClass} download>
            {a.label}
          </a>
          <span className="text-fg-secondary">{a.fileName}</span>
        </span>
      ),
    },
    {
      id: "category",
      header: t("columns.category"),
      cell: (a) => <Badge>{domain(`attachmentCategory.${a.category}`)}</Badge>,
    },
    { id: "size", header: t("columns.size"), cell: (a) => size(a.sizeBytes) },
    {
      id: "hash",
      header: t("columns.checksum"),
      cell: (a) =>
        a.sha256 ? (
          <code className="text-xs" title={a.sha256}>
            {a.sha256.slice(0, HASH_PREVIEW)}
          </code>
        ) : (
          domain("empty")
        ),
    },
    {
      id: "added",
      header: t("columns.added"),
      cell: (a) => <Stamp who={a.uploadedBy} whoId={a.uploadedById} at={a.uploadedAt} />,
    },
    {
      id: "actions",
      header: t("columns.actions"),
      hideHeader: true,
      align: "end",
      cell: (a) =>
        mayVoid(a) ? (
          <VoidDocumentButton unitId={unitId} attachmentId={a.id} label={a.label} />
        ) : null,
    },
  ];

  return (
    <Panel>
      <PanelHeader
        title={t("title")}
        description={t("description")}
        actions={<ActionButton action="upload" />}
      />
      <PanelBody>
        <DataTable
          caption={t("caption")}
          captionHidden
          columns={columns}
          rows={attachments}
          rowKey={(a) => a.id}
          density="compact"
          empty={<p className="text-fg-secondary">{t("empty")}</p>}
        />
      </PanelBody>
    </Panel>
  );
}

function ActivitiesTable({ activities }: { activities: UnitActivityView[] }) {
  const t = useTranslations("units.panels.activities");
  const domain = useTranslations("domain");

  const columns: Array<Column<UnitActivityView>> = [
    {
      id: "when",
      header: t("columns.when"),
      rowHeader: true,
      cell: (a) => <Stamp who={a.recordedBy} whoId={a.recordedById} at={a.date} />,
    },
    {
      id: "type",
      header: t("columns.type"),
      cell: (a) => <Badge>{domain(`activityType.${a.type}`)}</Badge>,
    },
    {
      id: "what",
      header: t("columns.what"),
      cell: (a) => (
        <span className="flex max-w-prose flex-col">
          <span className="font-medium">{a.title}</span>
          {a.details ? <span className="text-fg-secondary">{a.details}</span> : null}
        </span>
      ),
    },
  ];

  return (
    <Panel>
      <PanelHeader
        title={t("title")}
        description={t("description")}
        actions={<ActionButton action="recordActivity" />}
      />
      <PanelBody>
        <DataTable
          caption={t("caption")}
          captionHidden
          columns={columns}
          rows={activities}
          rowKey={(a) => a.id}
          density="compact"
          empty={<p className="text-fg-secondary">{t("empty")}</p>}
        />
      </PanelBody>
    </Panel>
  );
}
