import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bell, ListChecks, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, ListSkeleton, PriorityBadge, StatusBadge, EmptyState } from "@/components/ui-kit";
import { issueService } from "@/lib/services";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/useNotifications";

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Home — CampSolver" },
      { name: "description", content: "Your campus issue dashboard: quick actions and updates." },
      { property: "og:title", content: "Home — CampSolver" },
      { property: "og:description", content: "Quick actions and recent issue status." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { user } = useAuth();
  const { unread } = useNotifications();
  const { data, isLoading } = useQuery({ queryKey: ["issues"], queryFn: issueService.list });
  const recent = (Array.isArray(data) ? data : []).slice(0, 3);

  return (
    <AppShell title={`Hi, ${user?.name?.split(" ")[0] ?? "Student"}`}>
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/report"
            className="flex min-h-[104px] flex-col justify-between rounded-2xl bg-primary p-4 text-primary-foreground"
          >
            <PlusCircle className="h-6 w-6" aria-hidden="true" />
            <span className="text-sm font-bold">Report an issue</span>
          </Link>
          <Link
            to="/issues"
            className="flex min-h-[104px] flex-col justify-between rounded-2xl border border-border bg-card p-4"
          >
            <ListChecks className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-sm font-bold text-foreground">My issues</span>
          </Link>
        </div>

        <Link
          to="/notifications"
          className="flex min-h-[56px] items-center justify-between rounded-2xl border border-border bg-card px-4"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="h-5 w-5 text-primary" aria-hidden="true" /> Notifications
          </span>
          <span className="rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
            {unread} new
          </span>
        </Link>

        <section className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Recent activity
          </h2>
          {isLoading ? (
            <ListSkeleton rows={2} />
          ) : recent.length === 0 ? (
            <EmptyState
              title="No issues yet"
              body="Tap “Report an issue” to submit your first ticket."
            />
          ) : (
            recent.map((issue) => (
              <Link
                key={issue.ticketId}
                to="/issues/$ticketId"
                params={{ ticketId: issue.ticketId }}
              >
                <Card className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold text-foreground">{issue.title}</p>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {issue.ticketId}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={issue.status} />
                    <PriorityBadge priority={issue.priority} />
                  </div>
                </Card>
              </Link>
            ))
          )}
        </section>
      </div>
    </AppShell>
  );
}
