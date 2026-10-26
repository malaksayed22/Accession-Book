import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
 * Usage:
 *   <EmptyState
 *     icon={<Inbox />}
 *     title="No units yet"
 *     description="Units appear here once an experiment starts producing them."
 *     action={<Button variant="primary" href="/inventory/experiments/new">New experiment</Button>}
 *   />
 * Says what is empty, why that is fine or how to fix it, and offers at most one primary action.
 */
export type EmptyStateProps = {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** The single primary next step. */
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  action,
  headingLevel = 2,
  className,
}: EmptyStateProps) {
  const Heading = `h${headingLevel}` as const;
  return (
    <div className={cn("flex flex-col items-center px-4 py-14 text-center", className)}>
      {icon ? (
        <div
          aria-hidden="true"
          className="mb-4 inline-flex text-fg-tertiary [&>svg]:size-8 [&>svg]:stroke-[1.5]"
        >
          {icon}
        </div>
      ) : null}
      <Heading className="max-w-prose text-lg font-semibold tracking-[-0.02em] text-balance text-fg">
        {title}
      </Heading>
      {description ? (
        <p className="mt-2 max-w-prose text-sm text-pretty text-fg-secondary">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
