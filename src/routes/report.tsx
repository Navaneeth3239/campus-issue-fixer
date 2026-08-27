import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ImageIcon, MapPin, Video, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Field, inputClass, PriorityBadge, StatusBadge } from "@/components/ui-kit";
import { CATEGORIES, LOCATIONS, PRIORITIES, type Priority } from "@/lib/constants";
import { issueService } from "@/lib/services";
import type { AiSuggestion, DuplicateMatch, Issue } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report an Issue — CampSolver" },
      {
        name: "description",
        content:
          "Report a campus issue with photos, GPS location, category and priority in a few guided steps.",
      },
      { property: "og:title", content: "Report an Issue — CampSolver" },
      {
        property: "og:description",
        content: "Guided multi-step campus issue reporting with photo and GPS capture.",
      },
    ],
  }),
  component: ReportPage,
});

const DRAFT_KEY = "campsolver.draft";

interface Draft {
  title: string;
  description: string;
  category: string;
  location: string;
  priority: Priority;
  gps: { lat: number; lng: number } | null;
}

const emptyDraft: Draft = {
  title: "",
  description: "",
  category: "",
  location: "",
  priority: "MEDIUM",
  gps: null,
};

function ReportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [images, setImages] = useState<{ name: string; url: string }[]>([]);
  const [video, setVideo] = useState<{ name: string; url: string } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [suggestion, setSuggestion] = useState<AiSuggestion | null>(null);
  const [suggestionState, setSuggestionState] = useState<"open" | "dismissed">("open");
  const [duplicate, setDuplicate] = useState<DuplicateMatch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Issue | null>(null);
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Restore in-progress draft (text fields only; files can't be persisted).
  useEffect(() => {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        setDraft({ ...emptyDraft, ...(JSON.parse(raw) as Draft) });
      } catch {
        /* ignore corrupt draft */
      }
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const picked = Array.from(list);
    setFiles((prev) => [...prev, ...picked]);
    setImages((prev) => [
      ...prev,
      ...picked.map((f) => ({ name: f.name, url: URL.createObjectURL(f) })),
    ]);
    void requestSuggestion(picked.length);
  }

  async function requestSuggestion(count: number) {
    const result = await issueService.aiSuggest({
      title: draft.title,
      description: draft.description,
      imageCount: images.length + count,
    });
    if (result) {
      setSuggestion(result);
      setSuggestionState("open");
    }
  }

  function captureGps() {
    if (!("geolocation" in navigator)) {
      setGpsState("error");
      return;
    }
    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDraft((d) => ({
          ...d,
          gps: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        }));
        setGpsState("ok");
      },
      () => setGpsState("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function startSubmit() {
    setSubmitting(true);
    try {
      const validation = await issueService.validateLocation(draft.gps);
      if (!validation.allowed) {
        toast.error("Issue reporting is available only within the authorized campus area.");
        setSubmitting(false);
        return;
      }
      const dup = await issueService.checkDuplicate({
        title: draft.title,
        category: draft.category,
        location: draft.location,
        gps: draft.gps,
      });
      if (dup) {
        setDuplicate(dup);
        setSubmitting(false);
        return;
      }
      await finalSubmit();
    } catch {
      toast.error("Could not submit right now. Your draft is saved.");
      setSubmitting(false);
    }
  }

  async function finalSubmit() {
    setSubmitting(true);
    setDuplicate(null);
    try {
      const form = new FormData();
      form.append("title", draft.title);
      form.append("description", draft.description);
      form.append("category", draft.category);
      form.append("location", draft.location);
      form.append("priority", draft.priority);
      if (draft.gps) {
        form.append("latitude", String(draft.gps.lat));
        form.append("longitude", String(draft.gps.lng));
      }
      files.forEach((f) => form.append("media", f));
      if (videoFile) form.append("media", videoFile);

      const issue = await issueService.create(form, {
        ...draft,
        imagePreviews: images.map((i) => i.url),
      });
      window.localStorage.removeItem(DRAFT_KEY);
      await queryClient.invalidateQueries({ queryKey: ["issues"] });
      setCreated(issue);
    } catch {
      toast.error("Submission failed. Your draft is saved — please retry.");
    } finally {
      setSubmitting(false);
    }
  }

  async function followExisting() {
    if (!duplicate) return;
    await issueService.follow(duplicate.ticketId);
    window.localStorage.removeItem(DRAFT_KEY);
    await queryClient.invalidateQueries({ queryKey: ["issues"] });
    toast.success(`You are now following ${duplicate.ticketId}`);
    navigate({ to: "/issues/$ticketId", params: { ticketId: duplicate.ticketId } });
  }

  if (created) {
    return (
      <AppShell title="Ticket created">
        <div className="space-y-5 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Issue submitted</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Save this ticket ID to track your report.
            </p>
          </div>
          <Card className="space-y-2">
            <p className="text-2xl font-extrabold tracking-wider text-primary">
              {created.ticketId}
            </p>
            <p className="text-sm font-semibold text-foreground">{created.title}</p>
            <p className="text-xs text-muted-foreground">
              {created.category} · {created.location}
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <StatusBadge status={created.status} />
              <PriorityBadge priority={created.priority} />
            </div>
          </Card>
          <Link
            to="/issues/$ticketId"
            params={{ ticketId: created.ticketId }}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
          >
            Track this issue
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setCreated(null);
              setDraft(emptyDraft);
              setImages([]);
              setFiles([]);
              setVideo(null);
              setVideoFile(null);
              setSuggestion(null);
              setStep(0);
            }}
          >
            Report another issue
          </Button>
        </div>
      </AppShell>
    );
  }

  const stepValid =
    step === 0
      ? draft.title.trim().length > 3 && draft.description.trim().length > 5 && !!draft.category
      : step === 1
        ? true
        : !!draft.location;

  return (
    <AppShell title="Report an issue">
      <ol className="mb-5 flex gap-2" aria-label="Progress">
        {["Details", "Media", "Location & priority"].map((label, i) => (
          <li key={label} className="flex-1">
            <div
              className={cn("h-1.5 rounded-full", i <= step ? "bg-primary" : "bg-muted")}
              aria-hidden="true"
            />
            <span
              className={cn(
                "mt-1 block text-[11px] font-semibold",
                i === step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="space-y-4">
          <Field label="Title">
            <input
              className={inputClass}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Fan not working in Room 204"
            />
          </Field>
          <Field label="Description">
            <textarea
              className={cn(inputClass, "min-h-[120px] py-3")}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder="Describe what's wrong, since when, and how it affects you."
            />
          </Field>
          <Field label="Category">
            <select
              className={inputClass}
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card text-sm font-semibold text-foreground"
            >
              <Camera className="h-6 w-6 text-primary" aria-hidden="true" />
              Take photo
            </button>
            <button
              onClick={() => galleryRef.current?.click()}
              className="flex min-h-[96px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card text-sm font-semibold text-foreground"
            >
              <ImageIcon className="h-6 w-6 text-primary" aria-hidden="true" />
              From gallery
            </button>
          </div>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          {images.length > 0 ? (
            <ul className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <li key={`${img.name}-${i}`} className="relative">
                  <img
                    src={img.url}
                    alt={`Attached photo ${i + 1}`}
                    className="h-24 w-full rounded-xl object-cover"
                  />
                  <button
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => {
                      setImages((p) => p.filter((_, idx) => idx !== i));
                      setFiles((p) => p.filter((_, idx) => idx !== i));
                    }}
                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-foreground/80 text-background"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <Field label="Video (optional)">
            <label className="flex min-h-[56px] cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 text-sm font-semibold text-foreground">
              <Video className="h-5 w-5 text-primary" aria-hidden="true" />
              {video ? video.name : "Add a short video"}
              <input
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setVideoFile(f);
                  setVideo({ name: f.name, url: URL.createObjectURL(f) });
                }}
              />
            </label>
          </Field>
          {video ? (
            <Button variant="ghost" onClick={() => (setVideo(null), setVideoFile(null))}>
              Remove video
            </Button>
          ) : null}

          {suggestion && suggestionState === "open" ? (
            <Card className="space-y-3 border-accent/50 bg-accent/10">
              <p className="text-sm font-bold text-foreground">AI suggestion</p>
              <p className="text-xs text-muted-foreground">{suggestion.reason}</p>
              <p className="text-sm text-foreground">
                Category: <strong>{suggestion.category}</strong> · Priority:{" "}
                <strong>{suggestion.priority}</strong>
              </p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  onClick={() => {
                    setDraft((d) => ({
                      ...d,
                      category: suggestion.category ?? d.category,
                      priority: suggestion.priority ?? d.priority,
                    }));
                    setSuggestionState("dismissed");
                    toast.success("Suggestion applied");
                  }}
                >
                  Accept
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSuggestionState("dismissed");
                    setStep(0);
                  }}
                >
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => setSuggestionState("dismissed")}>
                  Ignore
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPin className="h-5 w-5 text-primary" aria-hidden="true" /> GPS location
            </div>
            <p className="text-xs text-muted-foreground">
              {gpsState === "ok" && draft.gps
                ? `Captured: ${draft.gps.lat.toFixed(5)}, ${draft.gps.lng.toFixed(5)}`
                : gpsState === "loading"
                  ? "Getting your location…"
                  : gpsState === "error"
                    ? "Location unavailable. Pick a campus location below."
                    : "Capture your current position to speed up verification."}
            </p>
            <Button variant="secondary" onClick={captureGps}>
              {draft.gps ? "Re-capture GPS" : "Capture GPS"}
            </Button>
          </Card>

          <Field label="Campus location">
            <select
              className={inputClass}
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            >
              <option value="">Select a location</option>
              {LOCATIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </Field>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-foreground">Priority</legend>
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setDraft({ ...draft, priority: p.value })}
                className={cn(
                  "flex w-full flex-col items-start gap-1 rounded-xl border p-3 text-left",
                  draft.priority === p.value
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card",
                )}
                aria-pressed={draft.priority === p.value}
              >
                <PriorityBadge priority={p.value} />
                <span className="text-xs text-muted-foreground">{p.help}</span>
              </button>
            ))}
          </fieldset>
        </div>
      ) : null}

      {duplicate ? (
        <Card className="mt-5 space-y-3 border-warning/50 bg-warning/10">
          <p className="text-sm font-bold text-foreground">Possible duplicate found</p>
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-primary">{duplicate.ticketId}</p>
            <p className="text-foreground">{duplicate.title}</p>
            <p className="text-xs text-muted-foreground">
              {duplicate.location} · {new Date(duplicate.createdAt).toLocaleDateString()}
            </p>
            <StatusBadge status={duplicate.status} />
          </div>
          <div className="grid gap-2">
            <Button onClick={() => void followExisting()}>Follow Existing Issue</Button>
            <Button variant="secondary" onClick={() => void finalSubmit()}>
              Report as Separate Issue
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 flex gap-3">
        {step > 0 ? (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        ) : null}
        {step < 2 ? (
          <Button disabled={!stepValid} onClick={() => setStep(step + 1)}>
            Continue
          </Button>
        ) : (
          <Button disabled={!stepValid || submitting} onClick={() => void startSubmit()}>
            {submitting ? "Submitting…" : "Submit issue"}
          </Button>
        )}
      </div>
    </AppShell>
  );
}
