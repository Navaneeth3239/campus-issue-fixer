import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Button, Card } from "@/components/ui-kit";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CampSolver" },
      { name: "description", content: "Your CampSolver account details and sign-out." },
      { property: "og:title", content: "Profile — CampSolver" },
      { property: "og:description", content: "Manage your CampSolver student account." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    signOut();
    navigate({ to: "/home", replace: true });
  }

  return (
    <AppShell title="Profile">
      <div className="space-y-4">
        <Card className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            {user?.name?.charAt(0).toUpperCase() ?? "S"}
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{user?.name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </Card>

        <Card className="space-y-3 text-sm">
          <Row label="Student ID" value={user?.studentId ?? "—"} />
          <Row label="Department" value={user?.department ?? "—"} />
          <Row label="Account" value="Student reporter" />
        </Card>

        <Button variant="danger" onClick={() => void handleSignOut()}>
          Log out
        </Button>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
