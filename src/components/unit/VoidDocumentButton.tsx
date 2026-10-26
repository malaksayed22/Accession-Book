"use client";

import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { IconButton } from "@/components/ui/IconButton";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { useApiError, useNetworkError } from "@/lib/api-error";
import { sendJson } from "@/lib/client-api";

/**
 * Removes a document from view. It is voided, never deleted: the file and the audit entry stay as
 * evidence, and a reason is mandatory. The server decides who may (an admin, or whoever attached it).
 */
export function VoidDocumentButton({
  unitId,
  attachmentId,
  label,
}: {
  unitId: number;
  attachmentId: number;
  label: string;
}) {
  const t = useTranslations("units.panels.documents.void");
  const router = useRouter();
  const { toast } = useToast();
  const apiError = useApiError();
  const networkError = useNetworkError();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async (reason: string) => {
    setPending(true);
    setError(null);
    const result = await sendJson(
      `/api/units/${unitId}/attachments/${attachmentId}`,
      { reason },
      "DELETE"
    );
    setPending(false);
    if (!result.ok) {
      setError(result.network ? networkError : apiError(result.error));
      return;
    }
    toast({ tone: "success", title: t("success", { label }) });
    setOpen(false);
    router.refresh();
  };

  return (
    <>
      <IconButton label={t("button", { label })} variant="ghost" onClick={() => setOpen(true)}>
        <Trash2 />
      </IconButton>
      {open ? (
        <ConfirmDialog
          open
          onOpenChange={(next) => {
            if (!next) {
              setOpen(false);
              setError(null);
            }
          }}
          title={t("title", { label })}
          description={t("description")}
          confirmLabel={t("confirm")}
          requireReason
          reasonLabel={t("reason")}
          reasonMinLength={10}
          pending={pending}
          error={error}
          onConfirm={({ reason }) => {
            void remove(reason);
          }}
        />
      ) : null}
    </>
  );
}
