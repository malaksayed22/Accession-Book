"use client";

import { ActionLauncher } from "@/components/ActionLauncher";

/**
 * Mounts the "Take action" launcher with this experiment as its context (register units, add
 * records). It renders no text of its own; the launcher belongs to the actions section.
 */
export function ExperimentActionShell({
  experimentId,
  experimentCode,
  experimentName,
  canEdit,
}: {
  experimentId: number;
  experimentCode: string;
  experimentName: string;
  canEdit: boolean;
}) {
  return (
    <ActionLauncher
      canEdit={canEdit}
      experimentContext={{ experimentId, experimentCode, experimentName, canEdit }}
    />
  );
}
