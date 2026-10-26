import { useTranslations } from "next-intl";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Link } from "@/i18n/navigation";

type Props = {
  address: string | null;
  country: string | null;
  licenceNumber: string | null;
  comment: string | null;
};

/** Contact and compliance details. The notes field is where contact people and preferences are kept. */
export function ProfilePanel({ address, country, licenceNumber, comment }: Props) {
  const t = useTranslations("organizations.detail.profile");
  const domain = useTranslations("domain");
  const entries: Array<{ label: string; value: string | null; mono?: boolean; href?: string }> = [
    { label: t("licence"), value: licenceNumber, mono: true },
    {
      label: t("country"),
      value: country,
      href: country ? `/records/organizations?country=${encodeURIComponent(country)}` : undefined,
    },
    { label: t("address"), value: address },
    { label: t("notes"), value: comment },
  ];
  return (
    <Panel>
      <PanelHeader title={t("title")} />
      <PanelBody>
        <dl className="grid gap-4 text-sm">
          {entries.map((entry) => (
            <div key={entry.label}>
              <dt className="text-fg-secondary">{entry.label}</dt>
              <dd className={entry.mono ? "mt-0.5 font-mono" : "mt-0.5 whitespace-pre-line"}>
                {entry.value && entry.href ? (
                  <Link href={entry.href} className="text-accent-text hover:underline">
                    {entry.value}
                  </Link>
                ) : (
                  entry.value || domain("empty")
                )}
              </dd>
            </div>
          ))}
        </dl>
      </PanelBody>
    </Panel>
  );
}
