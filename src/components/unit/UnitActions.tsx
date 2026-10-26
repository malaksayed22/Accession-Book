"use client";

import {
  ArrowRightLeft,
  ChevronDown,
  CirclePause,
  CirclePlay,
  ClipboardList,
  FlaskConical,
  GitBranchPlus,
  Link2,
  Pencil,
  Scale,
  Sprout,
  Trash2,
  TriangleAlert,
  Upload,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuTrigger,
} from "@/components/ui/DropdownMenu";
import { useToast } from "@/components/ui/Toast";
import { useRouter } from "@/i18n/navigation";
import { useApiError, useNetworkError } from "@/lib/api-error";
import { sendJson } from "@/lib/client-api";
import type { ActionAvailability, UnitActionId } from "@/lib/unit-actions";
import type { ActionUnit, Option } from "./action-types";
import {
  DeriveDialog,
  DestroyDialog,
  EditDialog,
  LinkParentDialog,
  MeasureDialog,
  MoveDialog,
  StageDialog,
} from "./unit-event-dialogs";
import {
  ActivityDialog,
  HoldDialog,
  IncidentDialog,
  TestDialog,
  UploadDialog,
} from "./unit-record-dialogs";

/*
 * One place that knows which actions this user may take on this unit right now (decided on the
 * server by `availabilityMap`, from the same rules the services enforce) and opens the matching
 * form. Buttons anywhere in the page open an action through `ActionButton`; the header menu lists
 * them all. The server still checks every request, so a stale page can never do more than allowed.
 */
type ActionsContext = {
  /** `opener` is the control to give focus back to when the form closes. */
  open: (action: UnitActionId, opener?: HTMLElement | null) => void;
  availability: Record<UnitActionId, ActionAvailability>;
};
const Context = createContext<ActionsContext | null>(null);

function useActions(): ActionsContext {
  const value = useContext(Context);
  if (!value) throw new Error("UnitActions components must be rendered inside UnitActionsProvider");
  return value;
}

const ICONS: Record<UnitActionId, LucideIcon> = {
  move: ArrowRightLeft,
  stage: Sprout,
  measure: Scale,
  derive: GitBranchPlus,
  edit: Pencil,
  linkParent: Link2,
  hold: CirclePause,
  releaseHold: CirclePlay,
  destroy: Trash2,
  recordTest: FlaskConical,
  reportIncident: TriangleAlert,
  recordActivity: ClipboardList,
  upload: Upload,
};

export function UnitActionsProvider({
  unit,
  availability,
  locations,
  witnesses,
  children,
}: {
  unit: ActionUnit;
  availability: Record<UnitActionId, ActionAvailability>;
  locations: Option[];
  witnesses: Option[];
  children: ReactNode;
}) {
  const [active, setActive] = useState<UnitActionId | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const close = useCallback(() => {
    setActive(null);
    // The form is not a child of its opener, so the dialog cannot restore focus by itself.
    const target = opener.current;
    opener.current = null;
    setTimeout(() => {
      if (target?.isConnected) target.focus();
      else document.querySelector<HTMLElement>("main h1")?.focus();
    }, 0);
  }, []);
  const open = useCallback(
    (action: UnitActionId, from?: HTMLElement | null) => {
      if (availability[action].status !== "allowed") return;
      opener.current = from ?? null;
      setActive(action);
    },
    [availability]
  );
  const value = useMemo(() => ({ open, availability }), [open, availability]);

  const dialog = (() => {
    switch (active) {
      case "move":
        return <MoveDialog unit={unit} locations={locations} onClose={close} />;
      case "stage":
        return <StageDialog unit={unit} onClose={close} />;
      case "measure":
        return <MeasureDialog unit={unit} onClose={close} />;
      case "derive":
        return <DeriveDialog unit={unit} locations={locations} onClose={close} />;
      case "edit":
        return <EditDialog unit={unit} onClose={close} />;
      case "linkParent":
        return <LinkParentDialog unit={unit} onClose={close} />;
      case "hold":
        return <HoldDialog unit={unit} onClose={close} />;
      case "releaseHold":
        return <ReleaseHoldDialog unit={unit} onClose={close} />;
      case "destroy":
        return <DestroyDialog unit={unit} witnesses={witnesses} onClose={close} />;
      case "recordTest":
        return <TestDialog unit={unit} onClose={close} />;
      case "reportIncident":
        return <IncidentDialog unit={unit} onClose={close} />;
      case "recordActivity":
        return <ActivityDialog unit={unit} onClose={close} />;
      case "upload":
        return <UploadDialog unit={unit} onClose={close} />;
      default:
        return null;
    }
  })();

  return (
    <Context.Provider value={value}>
      {children}
      {dialog}
    </Context.Provider>
  );
}

/** Releasing a hold re-opens movement of regulated material: reason required, password re-checked. */
function ReleaseHoldDialog({ unit, onClose }: { unit: ActionUnit; onClose: () => void }) {
  const t = useTranslations("units.actions.releaseHold");
  const router = useRouter();
  const { toast } = useToast();
  const apiError = useApiError();
  const networkError = useNetworkError();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const release = async (reason: string) => {
    setPending(true);
    setError(null);
    const result = await sendJson(`/api/units/${unit.id}/hold`, { action: "release", reason });
    setPending(false);
    if (!result.ok) {
      setError(result.network ? networkError : apiError(result.error));
      return;
    }
    toast({ tone: "success", title: t("success", { name: unit.name }) });
    onClose();
    router.refresh();
  };

  return (
    <ConfirmDialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={t("title", { name: unit.name })}
      description={t("description")}
      confirmLabel={t("confirm")}
      tone="primary"
      requireReason
      reasonLabel={t("reason")}
      reasonHint={t("reasonHint")}
      reasonMinLength={10}
      pending={pending}
      error={error}
      onConfirm={({ reason }) => {
        void release(reason);
      }}
    />
  );
}

type ActionButtonProps = {
  action: UnitActionId;
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
};

/** Opens an action's form. Renders nothing when the user may never do it here. */
export function ActionButton({
  action,
  children,
  variant = "secondary",
  ...rest
}: ActionButtonProps) {
  const t = useTranslations("units.actions.menu");
  const { open, availability } = useActions();
  const state = availability[action];
  if (state.status === "hidden") return null;
  const Icon = ICONS[action];
  return (
    <Button
      variant={variant}
      icon={<Icon />}
      disabled={state.status === "blocked"}
      onClick={(event) => open(action, event.currentTarget)}
      {...rest}
    >
      {children ?? t(action)}
    </Button>
  );
}

const MENU_GROUPS: ReadonlyArray<{
  id: "record" | "quality" | "files" | "details";
  actions: UnitActionId[];
}> = [
  { id: "record", actions: ["move", "stage", "measure", "derive"] },
  { id: "quality", actions: ["hold", "releaseHold", "recordTest", "reportIncident"] },
  { id: "files", actions: ["recordActivity", "upload"] },
  { id: "details", actions: ["edit", "linkParent"] },
];

/** The header menu: every action the user may take, with the ones a hold or a final state blocks greyed out. */
export function ActionsMenu() {
  const t = useTranslations("units.actions");
  const { open, availability } = useActions();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const groups = MENU_GROUPS.map((group) => ({
    ...group,
    actions: group.actions.filter((a) => availability[a].status !== "hidden"),
  })).filter((group) => group.actions.length > 0);
  const canDestroy = availability.destroy.status !== "hidden";
  if (groups.length === 0 && !canDestroy) return null;

  const item = (action: UnitActionId, tone?: "danger") => {
    const Icon = ICONS[action];
    return (
      <MenuItem
        key={action}
        icon={<Icon />}
        tone={tone}
        disabled={availability[action].status === "blocked"}
        onSelect={() => open(action, triggerRef.current)}
      >
        {t(`menu.${action}`)}
      </MenuItem>
    );
  };

  return (
    <Menu modal={false}>
      <MenuTrigger asChild>
        <Button ref={triggerRef} variant="primary" icon={<Zap />} iconAfter={<ChevronDown />}>
          {t("menu.label")}
        </Button>
      </MenuTrigger>
      <MenuContent>
        {groups.map((group, index) => (
          <Fragment key={group.id}>
            {index > 0 ? <MenuSeparator /> : null}
            <MenuLabel>{t(`groups.${group.id}`)}</MenuLabel>
            {group.actions.map((a) => item(a))}
          </Fragment>
        ))}
        {canDestroy ? (
          <>
            <MenuSeparator />
            {item("destroy", "danger")}
          </>
        ) : null}
      </MenuContent>
    </Menu>
  );
}
