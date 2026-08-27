import { api, API_BASE_URL } from "./api";
import { localStore, buildTimeline, makeTicketId } from "./local-store";
import type { AiSuggestion, AppNotification, DuplicateMatch, Issue, User } from "./types";
import type { IssueStatus, Priority } from "./constants";

/**
 * Every call hits the REST backend first. When the backend is unreachable
 * (offline / not yet deployed), we fall back to a local store so the app
 * stays usable and testable inside the Applix WebView shell.
 */
async function withFallback<T>(request: () => Promise<T>, fallback: () => T | Promise<T>) {
  // No backend configured yet (VITE_API_BASE_URL empty): run in local mode.
  if (!API_BASE_URL) return await fallback();
  try {
    return await request();
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status && status !== 404) throw error;
    return await fallback();
  }
}

export const authService = {
  login: (email: string, password: string) =>
    withFallback<{ token: string; user: User }>(
      async () => (await api.post("/auth/login", { email, password })).data,
      () => ({
        token: `local.${btoa(email)}`,
        user: { id: "local-user", name: email.split("@")[0] || "Student", email },
      }),
    ),
  register: (name: string, email: string, password: string) =>
    withFallback<{ token: string; user: User }>(
      async () => (await api.post("/auth/register", { name, email, password })).data,
      () => ({ token: `local.${btoa(email)}`, user: { id: "local-user", name, email } }),
    ),
  me: () => withFallback<User | null>(async () => (await api.get("/auth/me")).data, () => null),
};

export const issueService = {
  list: () =>
    withFallback<Issue[]>(
      async () => (await api.get("/issues/mine")).data,
      () => localStore.issues(),
    ),
  get: (ticketId: string) =>
    withFallback<Issue | null>(
      async () => (await api.get(`/issues/${ticketId}`)).data,
      () => localStore.issues().find((i) => i.ticketId === ticketId) ?? null,
    ),
  validateLocation: (coords: { lat: number; lng: number } | null) =>
    withFallback<{ allowed: boolean; message?: string }>(
      async () => (await api.post("/location/validate", coords ?? {})).data,
      () => ({ allowed: true }),
    ),
  aiSuggest: (payload: { title: string; description: string; imageCount: number }) =>
    withFallback<AiSuggestion | null>(
      async () => (await api.post("/ai/suggest", payload)).data,
      () => {
        if (!payload.imageCount) return null;
        const text = `${payload.title} ${payload.description}`.toLowerCase();
        if (text.includes("leak") || text.includes("water"))
          return {
            category: "Water Leakage",
            priority: "HIGH" as Priority,
            reason: "Image and text indicate active water leakage, which is a slip hazard.",
          };
        if (text.includes("wifi") || text.includes("network"))
          return {
            category: "Wi-Fi/Network",
            priority: "MEDIUM" as Priority,
            reason: "Detected connectivity related keywords in your report.",
          };
        return {
          category: "Infrastructure",
          priority: "MEDIUM" as Priority,
          reason: "Based on the uploaded photo this looks like a general infrastructure issue.",
        };
      },
    ),
  checkDuplicate: (payload: { title: string; category: string; location: string }) =>
    withFallback<DuplicateMatch | null>(
      async () => (await api.post("/issues/duplicate-check", payload)).data,
      () => {
        const match = localStore
          .issues()
          .find(
            (i) =>
              i.category === payload.category &&
              i.location === payload.location &&
              !["CLOSED", "VERIFIED"].includes(i.status),
          );
        return match
          ? {
              ticketId: match.ticketId,
              title: match.title,
              location: match.location,
              status: match.status,
              createdAt: match.createdAt,
            }
          : null;
      },
    ),
  follow: (ticketId: string) =>
    withFallback<{ ok: true }>(
      async () => (await api.post(`/issues/${ticketId}/follow`)).data,
      () => {
        localStore.updateIssue(ticketId, { followed: true });
        return { ok: true } as const;
      },
    ),
  create: (form: FormData, draft: Record<string, unknown>) =>
    withFallback<Issue>(
      async () =>
        (
          await api.post("/issues", form, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        ).data,
      () => {
        const issue: Issue = {
          id: crypto.randomUUID(),
          ticketId: makeTicketId(),
          title: String(draft["title"] ?? ""),
          description: String(draft["description"] ?? ""),
          category: String(draft["category"] ?? "Other"),
          location: String(draft["location"] ?? ""),
          gps: (draft["gps"] as Issue["gps"]) ?? null,
          priority: (draft["priority"] as Priority) ?? "MEDIUM",
          status: "REPORTED",
          createdAt: new Date().toISOString(),
          images: (draft["imagePreviews"] as string[]) ?? [],
          video: null,
          timeline: buildTimeline("REPORTED", { REPORTED: "Ticket created by student" }),
          resolution: null,
        };
        return localStore.addIssue(issue);
      },
    ),
  verify: (ticketId: string) =>
    withFallback<Issue | null>(
      async () => (await api.post(`/issues/${ticketId}/verify`)).data,
      () =>
        localStore.updateIssue(ticketId, {
          status: "VERIFIED" as IssueStatus,
          timeline: buildTimeline("VERIFIED", { VERIFIED: "Verified by reporter" }),
        }),
    ),
  reopen: (ticketId: string, reason: string) =>
    withFallback<Issue | null>(
      async () => (await api.post(`/issues/${ticketId}/reopen`, { reason })).data,
      () =>
        localStore.updateIssue(ticketId, {
          status: "IN_PROGRESS" as IssueStatus,
          resolution: null,
          timeline: buildTimeline("IN_PROGRESS", { IN_PROGRESS: `Reopened: ${reason}` }),
        }),
    ),
};

export const notificationService = {
  list: () =>
    withFallback<AppNotification[]>(
      async () => (await api.get("/notifications")).data,
      () => localStore.notifications(),
    ),
  markRead: (id: string) =>
    withFallback<{ ok: true }>(
      async () => (await api.post(`/notifications/${id}/read`)).data,
      () => {
        localStore.saveNotifications(
          localStore.notifications().map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        return { ok: true } as const;
      },
    ),
  markAllRead: () =>
    withFallback<{ ok: true }>(
      async () => (await api.post(`/notifications/read-all`)).data,
      () => {
        localStore.saveNotifications(localStore.notifications().map((n) => ({ ...n, read: true })));
        return { ok: true } as const;
      },
    ),
};
