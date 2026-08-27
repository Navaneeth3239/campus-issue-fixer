import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, EmptyState, ListSkeleton, PriorityBadge, StatusBadge } from "@/components/ui-kit";
import { issueService } from "@/lib/services";
import { STATUS_FLOW, STATUS_LABELS, type IssueStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/issues/")({
  head: () => ({
    meta: [
      { title: "My Issues — CampSolver" },
      {
        name: "description",
        content: "All the campus issues you reported or follow, filtered by status.",
      },
      { property: "og:title", content: "My Issues — CampSolver" },
      { property: "og:description", content: "Track reported and followed campus issues." },
    ],
  }),
  component: MyIssuesPage,
});

type Filter = "ALL" | IssueStatus;

function MyIssuesPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const { data, isLoading } = useQuery({ queryKey: ["issues"], queryFn: issueService.list });

  const issues = (Array.isArray(data) ? data : []).filter((i) => filter === "ALL" || i.status === filter);

  return (
    <AppShell title="My Issues">
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {(["ALL", ...STATUS_FLOW] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "min-h-[44px] shrink-0 rounded-full border px-4 text-xs font-semibold",
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {f === "ALL" ? "All" : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : issues.length === 0 ? (
        <EmptyState title="Nothing here" body="No issues match this filter yet." />
      ) : (
        <ul className="space-y-3">
          {issues.map((issue) => (
            <li key={issue.ticketId}>
              <Link to="/issues/$ticketId" params={{ ticketId: issue.ticketId }}>
                <Card className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">{issue.title}</p>
                    {issue.followed ? (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                        Following
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {issue.ticketId} · {issue.category} · {issue.location}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={issue.status} />
                    <PriorityBadge priority={issue.priority} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
