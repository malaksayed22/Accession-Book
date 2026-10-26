"use client";

import { usePathname } from "@/i18n/navigation";
import { ActionLauncher } from "./ActionLauncher";

export function GlobalActionShell() {
  const pathname = usePathname();
  const hasLocalLauncher =
    /^\/inventory\/units\/\d+/.test(pathname) || /^\/inventory\/experiments\/\d+/.test(pathname);

  if (hasLocalLauncher) return null;
  return <ActionLauncher />;
}
