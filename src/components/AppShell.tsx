import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Bell, Home, ListChecks, PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/useNotifications";

const tabs = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/issues", label: "My Issues", icon: ListChecks },
  { to: "/report", label: "Report", icon: PlusCircle },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function AppShell({
  title,
  children,
  back,
}: {
  title: string;
  children: ReactNode;
  back?: string;
}) {
  const { ready } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { unread } = useNotifications();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        {back ? (
          <Link
            to={back}
            className="-ml-2 flex h-11 w-11 items-center justify-center rounded-full text-foreground"
            aria-label="Go back"
          >
            ←
          </Link>
        ) : null}
        <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 border-t border-border bg-card">
        <ul className="grid grid-cols-5">
          {tabs.map((tab) => {
            const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`);
            const Icon = tab.icon;
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  className={cn(
                    "relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {tab.label}
                  {tab.to === "/notifications" && unread > 0 ? (
                    <span className="absolute right-4 top-2 min-w-[18px] rounded-full bg-danger px-1 text-[10px] font-bold leading-[18px] text-white">
                      {unread}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
