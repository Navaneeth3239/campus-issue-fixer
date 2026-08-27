import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Button, Card, EmptyState, ListSkeleton } from "@/components/ui-kit";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — CampSolver" },
      { name: "description", content: "Status updates and alerts about your campus issues." },
      { property: "og:title", content: "Notifications — CampSolver" },
      { property: "og:description", content: "Stay updated on your reported issues." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { list, isLoading, unread, markRead, markAllRead } = useNotifications();

  return (
    <AppShell title="Notifications">
      {unread > 0 ? (
        <Button variant="secondary" className="mb-4" onClick={() => void markAllRead()}>
          Mark all as read ({unread})
        </Button>
      ) : null}

      {isLoading ? (
        <ListSkeleton />
      ) : list.length === 0 ? (
        <EmptyState title="All caught up" body="You have no notifications right now." />
      ) : (
        <ul className="space-y-3">
          {list.map((n) => (
            <li key={n.id}>
              <Card className={cn("space-y-1", !n.read && "border-primary/40 bg-primary/5")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">{n.title}</p>
                  {!n.read ? (
                    <span className="shrink-0 rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold text-white">
                      New
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <p className="text-[11px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
                <div className="flex gap-2 pt-2">
                  {n.ticketId ? (
                    <Link
                      to="/issues/$ticketId"
                      params={{ ticketId: n.ticketId }}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-border text-sm font-semibold text-foreground"
                    >
                      View ticket
                    </Link>
                  ) : null}
                  {!n.read ? (
                    <Button variant="ghost" className="flex-1" onClick={() => void markRead(n.id)}>
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
