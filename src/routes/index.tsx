import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CampSolver — Report Campus Issues in Seconds" },
      {
        name: "description",
        content:
          "CampSolver lets students report campus issues with photos, GPS and live status tracking from their phone.",
      },
      { property: "og:title", content: "CampSolver — Report Campus Issues in Seconds" },
      {
        property: "og:description",
        content: "Report, track and verify campus maintenance issues from your phone.",
      },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => navigate({ to: "/home", replace: true }), 400);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-primary px-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent">
        <ShieldCheck className="h-10 w-10 text-accent-foreground" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight text-primary-foreground">CampSolver</h1>
      <p className="text-sm text-primary-foreground/80">
        Report campus issues. Track every fix. Verify the result.
      </p>
      <span className="mt-4 h-1 w-24 animate-pulse rounded-full bg-accent" aria-hidden="true" />
    </div>
  );
}
