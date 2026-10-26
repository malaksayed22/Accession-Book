import type { ActionId } from "@/lib/action-catalog";

/** What a finished action reports: values for the "done" sentence and an optional link to the result. */
export type ActionOutcome = {
  values: Record<string, string | number>;
  href?: string;
};

export type LauncherState =
  | { phase: "menu" }
  | { phase: "form"; action: ActionId }
  | { phase: "done"; action: ActionId; outcome: ActionOutcome };

export type LauncherEvent =
  | { type: "choose"; action: ActionId }
  | { type: "back" }
  | { type: "complete"; outcome: ActionOutcome }
  | { type: "again" };

export function initialLauncherState(initialAction?: ActionId): LauncherState {
  return initialAction ? { phase: "form", action: initialAction } : { phase: "menu" };
}

export function launcherReducer(state: LauncherState, event: LauncherEvent): LauncherState {
  switch (event.type) {
    case "choose":
      return { phase: "form", action: event.action };
    case "back":
    case "again":
      return { phase: "menu" };
    case "complete":
      return state.phase === "form"
        ? { phase: "done", action: state.action, outcome: event.outcome }
        : state;
  }
}
