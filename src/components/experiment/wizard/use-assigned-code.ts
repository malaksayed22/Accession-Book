"use client";

import { useEffect, useState } from "react";

/**
 * The code the next experiment of this prefix would get. It is only a preview (the number is
 * allocated atomically when the experiment is created), refreshed shortly after the prefix changes.
 */
export function useAssignedCode(prefix: string, defaultPrefix: string, defaultCode: string) {
  const [lookup, setLookup] = useState<{ prefix: string; code: string } | null>(null);
  const usesDefault = prefix === defaultPrefix || prefix.length < 2;

  useEffect(() => {
    if (usesDefault) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/experiments/next-code?prefix=${prefix}`);
        const data = (await response.json()) as { ok?: boolean; ecode?: string };
        if (data.ok && data.ecode && !cancelled) setLookup({ prefix, code: data.ecode });
      } catch {
        // A preview only: the real code is assigned on creation.
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [prefix, usesDefault]);

  if (usesDefault) return defaultCode;
  return lookup?.prefix === prefix ? lookup.code : null;
}
