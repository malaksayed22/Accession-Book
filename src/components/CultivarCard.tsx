import { Dna, TriangleAlert } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type CultivarCardData = {
  id: number;
  name: string;
  code: string | null;
  commonName: string | null;
  category: string | null;
  targetThc: number | null;
  targetCbd: number | null;
  comment: string | null;
  stats: {
    totalUnits: number;
    activeUnits: number;
    onHold: number;
    experiments: number;
    locations: number;
  };
};

/*
 * Usage: <ul><li><CultivarCard cultivar={row} /></li></ul>
 * One cultivar of the genetic library as a link card: names, category, target potency and what is
 * in inventory right now. Every figure carries its label, and "on hold" is a badge with an icon.
 * Server-friendly (no client state).
 */
export function CultivarCard({
  cultivar,
  className,
}: {
  cultivar: CultivarCardData;
  className?: string;
}) {
  const t = useTranslations("cultivars.card");
  const domain = useTranslations("domain");
  const format = useFormatter();
  const potency = (value: number | null) =>
    value === null ? domain("empty") : format.number(value / 100, "percent");
  const { stats } = cultivar;

  return (
    <Link
      href={`/records/cultivars/${cultivar.id}`}
      className={cn(
        "flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-border-strong hover:bg-hover motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold text-fg wrap-break-word">
            <Dna aria-hidden="true" className="size-4 shrink-0 text-accent-text" />
            {cultivar.name}
          </h3>
          {cultivar.code || cultivar.commonName ? (
            <p className="mt-0.5 text-sm text-fg-secondary wrap-break-word">
              {[cultivar.code, cultivar.commonName].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        {cultivar.category ? <Badge tone="neutral">{cultivar.category}</Badge> : null}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-fg-secondary">{t("targetThc")}</dt>
          <dd className="font-medium tabular-nums">{potency(cultivar.targetThc)}</dd>
        </div>
        <div>
          <dt className="text-fg-secondary">{t("targetCbd")}</dt>
          <dd className="font-medium tabular-nums">{potency(cultivar.targetCbd)}</dd>
        </div>
        <div>
          <dt className="text-fg-secondary">{t("inInventory")}</dt>
          <dd className="font-medium tabular-nums">
            {t("inventoryOf", { active: stats.activeUnits, total: stats.totalUnits })}
          </dd>
        </div>
        <div>
          <dt className="text-fg-secondary">{t("experiments")}</dt>
          <dd className="font-medium tabular-nums">{format.number(stats.experiments, "count")}</dd>
        </div>
      </dl>

      {stats.onHold > 0 ? (
        <Badge tone="warning" icon={<TriangleAlert />} className="self-start">
          {t("onHold", { count: stats.onHold })}
        </Badge>
      ) : null}

      <p className="mt-auto line-clamp-2 text-sm text-fg-secondary">
        {cultivar.comment || t("noNotes")}
      </p>
    </Link>
  );
}
