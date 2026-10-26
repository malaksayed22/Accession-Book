"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "./password-rules";

/** The JSON body of a failed API call (see `withApi` in `server/http.ts`). */
export type ApiErrorBody = {
  ok?: false;
  code?: string;
  /** English fallback; the UI prefers its own translation of `code`. */
  error?: string;
  requestId?: string;
  params?: { issue?: string; retryAfterSeconds?: number; units?: number } | null;
};

/**
 * Turns a failed API response into a sentence in the user's language. Falls back to the generic
 * message when the code is unknown, never to raw server text in another language.
 */
export function useApiError() {
  const t = useTranslations("errors");
  // Keys are built from server-sent codes, so they cannot be checked at compile time.
  const message = t as unknown as (key: string, values?: Record<string, unknown>) => string;
  const exists = t.has as unknown as (key: string) => boolean;

  return useCallback(
    (body: ApiErrorBody | null | undefined): string => {
      const code = body?.code;
      if (!code) return t("unknown");

      if (code === "PASSWORD_POLICY") {
        const key = `passwordIssues.${body?.params?.issue}`;
        if (exists(key))
          return message(key, { min: MIN_PASSWORD_LENGTH, max: MAX_PASSWORD_LENGTH });
      }
      if (code === "RATE_LIMITED") {
        const seconds = body?.params?.retryAfterSeconds ?? 60;
        return message("codes.RATE_LIMITED", { minutes: Math.max(1, Math.ceil(seconds / 60)) });
      }
      if (code === "LOCATION_NOT_EMPTY") {
        return message("codes.LOCATION_NOT_EMPTY", { units: body?.params?.units ?? 0 });
      }
      const key = `codes.${code}`;
      return exists(key) ? message(key) : t("unknown");
    },
    [t, message, exists]
  );
}

/** For fetch failures that never produced a response (offline, DNS, dropped connection). */
export function useNetworkError() {
  const t = useTranslations("errors");
  return t("network");
}
