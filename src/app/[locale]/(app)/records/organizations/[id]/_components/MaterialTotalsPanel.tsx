import { useFormatter, useTranslations } from "next-intl";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Link } from "@/i18n/navigation";
import type { MaterialTotals } from "@/lib/materials";
import { nonZeroTotals } from "@/lib/organization-profile";

type Props = {
  title: string;
  description: string;
  totals: MaterialTotals;
  /** Where the shipments behind these totals are listed; the title links there. */
  href?: string;
};

/** Counts and grams that actually moved (in transit or delivered), the way a CTLS return groups them. */
export function MaterialTotalsPanel({ title, description, totals, href }: Props) {
  const t = useTranslations("organizations.detail.totals");
  const format = useFormatter();
  const entries = nonZeroTotals(totals);

  return (
    <Panel>
      <PanelHeader
        title={
          href ? (
            <Link href={href} className="text-accent-text hover:underline">
              {title}
            </Link>
          ) : (
            title
          )
        }
        description={description}
      />
      <PanelBody>
        {entries.length === 0 ? (
          <p className="text-sm text-fg-secondary">{t("none")}</p>
        ) : (
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries.map(({ key, value }) => (
              <div key={key} className="rounded-lg border border-border bg-sunken px-3 py-2">
                <dt className="text-sm text-fg-secondary">{t(`labels.${key}`)}</dt>
                <dd className="text-lg font-semibold tabular-nums">
                  {format.number(
                    value,
                    key === "wetGrams" || key === "dryGrams" ? "grams" : "count"
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </PanelBody>
    </Panel>
  );
}
