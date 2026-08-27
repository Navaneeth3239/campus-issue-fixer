import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  PRIORITY_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  type IssueStatus,
  type Priority,
} from "@/lib/constants";
import { AlertTriangle, CheckCircle2, Circle, Clock, Loader2, Wrench } from "lucide-react";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-card p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  );
}

const statusIcon: Record<IssueStatus, typeof Circle> = {
  REPORTED: Clock,
  ASSIGNED: Wrench,
  IN_PROGRESS: Loader2,
  RESOLVED: AlertTriangle,
  VERIFIED: CheckCircle2,
  CLOSED: CheckCircle2,
};

export function StatusBadge({ status }: { status: IssueStatus }) {
  const Icon = statusIcon[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status],
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
        PRIORITY_STYLES[priority],
      )}
    >
      <span aria-hidden="true">{priority === "HIGH" ? "▲" : priority === "MEDIUM" ? "■" : "●"}</span>
      {priority} priority
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants: Record<string, string> = {
    primary: "bg-primary text-primary-foreground active:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground border border-border active:bg-muted",
    ghost: "bg-transparent text-foreground active:bg-muted",
    danger: "bg-danger text-white active:bg-danger/90",
  };
  return (
    <button
      {...props}
      className={cn(
        "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-50",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full min-h-[48px] rounded-xl border border-input bg-background px-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-ring";

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
