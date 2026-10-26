import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { env } from "@/server/env";
import { loadMessages } from "./messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: await loadMessages(locale),
    // Zones are explicit so server and browser render the same clock.
    timeZone: env().LAB_TIMEZONE,
    formats: {
      number: {
        /** Regulated weights: grams to the milligram. `format.number(w, "grams")` */
        grams: { style: "unit", unit: "gram", maximumFractionDigits: 3 },
        /** Unit counts: whole numbers. */
        count: { maximumFractionDigits: 0 },
        percent: { style: "percent", maximumFractionDigits: 1 },
      },
      dateTime: {
        date: { year: "numeric", month: "short", day: "numeric" },
        /** Calendar day of the laboratory (ISO-like in both languages for regulatory exports). */
        isoDate: { year: "numeric", month: "2-digit", day: "2-digit" },
        time: { hour: "2-digit", minute: "2-digit" },
        dateTime: {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          timeZoneName: "short",
        },
      },
    },
  };
});
