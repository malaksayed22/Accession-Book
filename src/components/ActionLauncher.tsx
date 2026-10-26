"use client";

import { Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { ActionDialog } from "@/components/actions/ActionDialog";
import type { ActionContext } from "@/components/actions/types";
import { Button } from "@/components/ui/Button";
import { usePathname } from "@/i18n/navigation";

type UnitContext = {
  unitId: number;
  unitName: string;
  unitType: string;
  lifecycleState: string;
  isDestroyed: boolean;
  experimentId?: number | null;
  experimentCode?: string | null;
  experimentName?: string | null;
  cultivarId?: number | null;
};

type ExperimentContext = {
  experimentId: number;
  experimentCode: string;
  experimentName: string;
  canEdit: boolean;
};

type ActionLauncherProps = {
  canEdit?: boolean;
  unitContext?: UnitContext;
  experimentContext?: ExperimentContext;
};

function contextFor(
  pathname: string,
  canEdit: boolean,
  unitContext?: UnitContext,
  experimentContext?: ExperimentContext
): ActionContext {
  if (unitContext) {
    return {
      scope: "unit",
      unitId: unitContext.unitId,
      unitName: unitContext.unitName,
      unitType: unitContext.unitType,
      lifecycleState: unitContext.lifecycleState,
      isDestroyed: unitContext.isDestroyed,
      canEdit: canEdit && !unitContext.isDestroyed,
      experimentId: unitContext.experimentId ?? undefined,
      experimentCode: unitContext.experimentCode ?? undefined,
      experimentName: unitContext.experimentName ?? undefined,
      cultivarId: unitContext.cultivarId ?? undefined,
    };
  }
  if (experimentContext || /^\/inventory\/experiments\/\d+/.test(pathname)) {
    return {
      scope: "experiment",
      experimentId: experimentContext?.experimentId,
      experimentCode: experimentContext?.experimentCode,
      experimentName: experimentContext?.experimentName,
      canEdit: experimentContext?.canEdit ?? canEdit,
    };
  }
  return { scope: "global", canEdit };
}

/**
 * The floating "Take action" button and the dialog it opens. One instance lives in the app shell
 * for laboratory-wide actions; unit and experiment pages render their own with that record as
 * context (through UnitActionShell / ExperimentActionShell).
 */
export function ActionLauncher({
  canEdit = true,
  unitContext,
  experimentContext,
}: ActionLauncherProps) {
  const t = useTranslations("actions.launcher");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const context = useMemo(
    () => contextFor(pathname, canEdit, unitContext, experimentContext),
    [pathname, canEdit, unitContext, experimentContext]
  );

  // A destroyed unit has nothing left to act on.
  if (unitContext?.isDestroyed === true) return null;

  return (
    <ActionDialog
      context={context}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          variant="primary"
          size="lg"
          icon={<Zap />}
          className="fixed end-4 bottom-4 z-30 shadow-lg max-sm:size-14 max-sm:px-0 sm:end-6 sm:bottom-6 print:hidden"
        >
          {/* A round icon on phones so it covers as little of the page as possible. */}
          <span className="max-sm:sr-only">{t("open")}</span>
        </Button>
      }
    />
  );
}

/** A plain "Take action" button for pages that want their own entry point; `onClick` opens whatever they wire. */
export function TakeActionButton({
  onClick,
  label,
  compact,
}: {
  onClick: () => void;
  label?: string;
  compact?: boolean;
}) {
  const t = useTranslations("actions.launcher");
  return (
    <Button variant="primary" size={compact ? "sm" : "md"} icon={<Zap />} onClick={onClick}>
      {label ?? t("open")}
    </Button>
  );
}
