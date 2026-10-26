import { useTranslations } from "next-intl";
import { Panel, PanelBody, PanelHeader } from "@/components/ui/Panel";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { LifecycleStageId } from "@/lib/lifecycle-stages";
import { DURATION_STAGES, type StageDurationSummary } from "@/lib/stage-durations";
import { Day, linkClass } from "@/components/unit/common";

/**
 * Days spent in each phase of the lifecycle, derived from the unit's stage-change events. Bars are
 * proportional to the longest stay; the number next to each bar carries the meaning, so nothing
 * depends on colour or bar length alone.
 */
export function UnitStageDurations({ summary }: { summary: StageDurationSummary }) {
  const t = useTranslations("units.panels.timing");
  const domain = useTranslations("domain");
  const { spans, totals, current, totalDays } = summary;
  const longest = Math.max(1, ...spans.map((span) => span.days));
  const stageName = (stage: LifecycleStageId) => domain(`growthStage.${stage}`);

  return (
    <Panel>
      <PanelHeader
        title={t("title")}
        description={t("description")}
        actions={
          current ? (
            <p className="text-sm font-medium text-fg">
              {t("currently", { stage: stageName(current.stage), day: current.days })}
            </p>
          ) : undefined
        }
      />
      <PanelBody className="space-y-5">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {DURATION_STAGES.map((stage) => {
            const days = totals[stage] ?? 0;
            const active = current?.stage === stage;
            return (
              <li
                key={stage}
                className={cn(
                  "rounded-lg border p-3",
                  active ? "border-accent bg-accent-soft" : "border-border bg-sunken"
                )}
              >
                <p className="text-sm">
                  <Link href={`/inventory/units?stage=${stage}`} className={linkClass}>
                    {stageName(stage)}
                  </Link>
                </p>
                <p className="mt-1 text-xl font-semibold whitespace-nowrap text-fg tabular-nums">
                  {t("days", { count: days })}
                </p>
                {active ? <p className="text-xs font-medium text-accent-text">{t("now")}</p> : null}
              </li>
            );
          })}
        </ul>

        {spans.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-fg-secondary">
            {t("empty")}
          </p>
        ) : (
          <>
            <ol className="space-y-2">
              {spans.map((span, index) => (
                <li key={`${span.stage}-${index}`} className="flex items-center gap-3 text-sm">
                  <span className="w-28 shrink-0 text-fg">{stageName(span.stage)}</span>
                  <span className="h-3 flex-1 overflow-hidden rounded-full bg-sunken" aria-hidden>
                    <span
                      className={cn(
                        "block h-full rounded-full bg-accent",
                        span.ongoing ? "opacity-100" : "opacity-60"
                      )}
                      style={{ width: `${Math.max(4, (span.days / longest) * 100)}%` }}
                    />
                  </span>
                  <span className="w-40 shrink-0 text-end text-fg-secondary tabular-nums">
                    {t("days", { count: span.days })}
                    {span.ongoing ? ` · ${t("ongoing")}` : ""}
                  </span>
                </li>
              ))}
            </ol>
            <p className="flex flex-wrap justify-between gap-2 border-t border-border pt-3 text-sm">
              <span className="text-fg-secondary">
                {t("trackedSince")} <Day value={spans[0]?.start ?? null} />
              </span>
              <span className="font-medium text-fg">{t("total", { count: totalDays })}</span>
            </p>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
