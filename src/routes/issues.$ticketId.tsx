import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  Button,
  Card,
  EmptyState,
  ListSkeleton,
  PriorityBadge,
  StatusBadge,
  inputClass,
} from "@/components/ui-kit";
import { StatusTimeline } from "@/components/StatusTimeline";
import { issueService } from "@/lib/services";
import { getSocket } from "@/lib/socket";
import type { Issue } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/issues/$ticketId")({
  head: () => ({
    meta: [
      { title: "Issue details — CampSolver" },
      {
        name: "description",
        content: "Live status timeline, photos and resolution verification for your campus issue.",
      },
      { property: "og:title", content: "Issue details — CampSolver" },
      { property: "og:description", content: "Track and verify a campus issue in real time." },
    ],
  }),
  component: IssueDetailPage,
});

function IssueDetailPage() {
  const { ticketId } = useParams({ from: "/issues/$ticketId" });
  const queryClient = useQueryClient();
  const [reopening, setReopening] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["issue", ticketId],
    queryFn: () => issueService.get(ticketId),
  });

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const room = `issue:${ticketId}`;
    socket.emit("join", room);

    const apply = (payload: Partial<Issue>) => {
      queryClient.setQueryData<Issue | null>(["issue", ticketId], (prev) =>
        prev ? { ...prev, ...payload } : prev,
      );
      void queryClient.invalidateQueries({ queryKey: ["issues"] });
    };

    socket.on("issueStatusChanged", apply);
    socket.on("issueUpdated", apply);
    socket.on("issueResolved", apply);

    return () => {
      socket.emit("leave", room);
      socket.off("issueStatusChanged", apply);
      socket.off("issueUpdated", apply);
      socket.off("issueResolved", apply);
    };
  }, [ticketId, queryClient]);

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["issue", ticketId] });
    await queryClient.invalidateQueries({ queryKey: ["issues"] });
  }

  async function verify() {
    setBusy(true);
    try {
      await issueService.verify(ticketId);
      await refresh();
      toast.success("Thanks! Resolution verified.");
    } finally {
      setBusy(false);
    }
  }

  async function reopen() {
    if (reason.trim().length < 5) {
      toast.error("Please tell us what is still wrong.");
      return;
    }
    setBusy(true);
    try {
      await issueService.reopen(ticketId, reason.trim());
      await refresh();
      setReopening(false);
      setReason("");
      toast.success("Issue reopened for the department.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title={ticketId} back="/issues">
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : !data ? (
        <EmptyState title="Issue not found" body="This ticket may have been removed." />
      ) : (
        <div className="space-y-5">
          <Card className="space-y-3">
            <h2 className="text-lg font-bold text-foreground">{data.title}</h2>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={data.status} />
              <PriorityBadge priority={data.priority} />
            </div>
            <p className="text-sm text-muted-foreground">{data.description}</p>
            <dl className="grid grid-cols-2 gap-2 text-xs">
              <Meta label="Category" value={data.category} />
              <Meta label="Location" value={data.location} />
              <Meta label="Reported" value={new Date(data.createdAt).toLocaleString()} />
              <Meta
                label="GPS"
                value={data.gps ? `${data.gps.lat.toFixed(4)}, ${data.gps.lng.toFixed(4)}` : "—"}
              />
            </dl>
          </Card>

          {(data.images ?? []).length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {(data.images ?? []).map((src, i) => (
                <li key={i}>
                  <img
                    src={src}
                    alt={`Issue photo ${i + 1}`}
                    className="h-24 w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          {data.status === "RESOLVED" ? (
            <Card className="space-y-3 border-accent/50 bg-accent/10">
              <p className="text-sm font-bold text-foreground">Resolution submitted</p>
              <p className="text-sm text-muted-foreground">
                {data.resolution?.comment ?? "The department marked this issue as resolved."}
              </p>
              {data.resolution?.image ? (
                <img
                  src={data.resolution.image}
                  alt="Resolution proof"
                  className="w-full rounded-xl object-cover"
                  loading="lazy"
                />
              ) : null}
              {reopening ? (
                <div className="space-y-2">
                  <textarea
                    className={cn(inputClass, "min-h-[96px] py-3")}
                    placeholder="What is still not fixed?"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button variant="danger" disabled={busy} onClick={() => void reopen()}>
                    Confirm reopen
                  </Button>
                  <Button variant="ghost" onClick={() => setReopening(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  <Button disabled={busy} onClick={() => void verify()}>
                    Verify — issue is fixed
                  </Button>
                  <Button variant="secondary" onClick={() => setReopening(true)}>
                    Reject &amp; reopen
                  </Button>
                </div>
              )}
            </Card>
          ) : null}

          <Card>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Status timeline
            </h3>
            <StatusTimeline steps={data.timeline ?? []} status={data.status} />
            <p className="mt-4 text-[11px] text-muted-foreground">
              Updates arrive live — no need to refresh.
            </p>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted p-2">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-foreground">{value}</dd>
    </div>
  );
}
