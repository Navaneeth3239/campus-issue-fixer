import { STATUS_LABELS, type IssueStatus } from "@/lib/constants";
import type { TimelineStep } from "@/lib/types";
import { cn } from "@/lib/utils";

function marker(step: TimelineStep, current: boolean) {
  if (current) return "●";
  return step.done ? "✓" : "○";
}

export function StatusTimeline({ steps, status }: { steps: TimelineStep[]; status: IssueStatus }) {
  return (
    <ol className="relative space-y-5 pl-7">
      <span className="absolute left-[10px] top-2 h-[calc(100%-1rem)] w-px bg-border" aria-hidden />
      {steps.map((step) => {
        const current = step.status === status;
        return (
          <li key={step.status} className="relative">
            <span
              className={cn(
                "absolute -left-7 flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold",
                current
                  ? "border-warning bg-warning text-white"
                  : step.done
                    ? "border-success bg-success text-white"
                    : "border-border bg-background text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {marker(step, current)}
            </span>
            <p
              className={cn(
                "text-sm font-semibold",
                step.done || current ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {STATUS_LABELS[step.status]}
              {current ? " — current" : ""}
            </p>
            {step.at ? (
              <p className="text-xs text-muted-foreground">
                {new Date(step.at).toLocaleString()}
                {step.department ? ` · ${step.department}` : ""}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Pending</p>
            )}
            {step.action ? <p className="mt-0.5 text-xs text-foreground/80">{step.action}</p> : null}
            {step.comment ? (
              <p className="mt-1 rounded-lg bg-muted p-2 text-xs text-foreground/80">
                {step.comment}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
