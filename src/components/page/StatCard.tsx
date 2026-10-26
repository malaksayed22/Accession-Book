import { ArrowUpRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/*
 * Usage: <StatCard label="Units on hold" value={3} hint="Quality and quarantine" href="/quality" tone="warning" />
 * One headline number with its meaning. With `href` the whole card is a link (the label is the link
 * text) and an arrow appears on hover. `tone` colours only a small dot beside the label; the label
 * and hint always say what the number means, so colour is never the only signal. Pass `index` to
 * make a row of cards rise in one after another.
 */
export type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: "default" | "warning" | "danger" | "success";
  /** Position in a row of cards, for the staggered entrance. */
  index?: number;
  className?: string;
};

const DOT: Record<NonNullable<StatCardProps["tone"]>, string> = {
  default: "bg-fg-tertiary",
  warning: "bg-warning-solid",
  danger: "bg-danger-solid",
  success: "bg-success-solid",
};

export function StatCard({
  label,
  value,
  hint,
  href,
  tone = "default",
  index,
  className,
}: StatCardProps) {
  const body = (
    <>
      <span className="flex items-center gap-2 text-sm font-medium text-fg-secondary">
        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", DOT[tone])} />
        <span className="min-w-0 text-pretty">{label}</span>
      </span>
      <span className="mt-5 block text-5xl leading-none font-semibold tracking-[-0.045em] text-fg tabular-nums">
        {value}
      </span>
      {hint ? (
        <span className="mt-4 block text-sm text-pretty text-fg-secondary">{hint}</span>
      ) : null}
      {href ? (
        <ArrowUpRight
          aria-hidden
          className="absolute end-5 top-5 size-4 text-fg-tertiary opacity-0 transition-[opacity,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        />
      ) : null}
    </>
  );
  const shared = cn(
    "group relative block rounded-xl border border-border bg-surface p-5 sm:p-6",
    index !== undefined && "rise",
    className
  );
  const style = index !== undefined ? ({ "--i": index } as CSSProperties) : undefined;

  return href ? (
    <Link
      href={href}
      style={style}
      className={cn(
        shared,
        "transition-[border-color,background-color] duration-200 hover:border-border-strong hover:bg-hover motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      )}
    >
      {body}
    </Link>
  ) : (
    <div style={style} className={shared}>
      {body}
    </div>
  );
}
