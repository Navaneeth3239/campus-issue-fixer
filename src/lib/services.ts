import { api, API_BASE_URL } from "./api";
import {
  type BackendActivityRow,
  type BackendIssueRow,
  type BackendNotificationRow,
  isUuid,
  mapDuplicateMatch,
  mapIssue,
  mapNotification,
  mapUser,
} from "./backend-mapper";
import { localStore, buildTimeline, makeTicketId } from "./local-store";
import type { AiSuggestion, AppNotification, DuplicateMatch, Issue, User } from "./types";
import type { IssueStatus, Priority } from "./constants";

const isBrowser = typeof window !== "undefined";

/**
 * Every call hits the REST backend first. When the backend is unreachable
 * (offline / not yet deployed), we fall back to a local store so the app
 * stays usable and testable inside the Applix WebView shell.
 */
async function withFallback<T>(request: () => Promise<T>, fallback: () => T | Promise<T>) {
  // SSR: never call the REST API from the server — avoids crashes when backend/auth unavailable.
  if (!isBrowser || !API_BASE_URL) return await fallback();
  try {
    return await request();
  } catch (error: unknown) {
    const response = (error as { response?: { status?: number } })?.response;
    const status = response?.status;
    // Network failure or auth/server errors → graceful local fallback for reads.
    if (!response || status === 404 || status === 401 || (status != null && status >= 500)) {
      return await fallback();
    }
    throw error;
  }
}

function extractToken(session: { access_token?: string } | null | undefined): string {
  return session?.access_token ?? "";
}

/** Resolve ticket id (CS-YYYY-XXXXX) to backend issue uuid. */
async function resolveIssueUuid(ticketOrId: string): Promise<string | null> {
  if (isUuid(ticketOrId)) return ticketOrId;

  const { data } = await api.get<{ issues: BackendIssueRow[] }>("/issues/mine");
  const match = data.issues?.find((row) => row.ticket_id === ticketOrId);
  return match?.id ?? null;
}

export const authService = {
  login: async (email: string, password: string) => {
    if (!isBrowser || !API_BASE_URL) {
      return {
        token: `local.${btoa(email)}`,
        user: { id: "local-user", name: email.split("@")[0] || "Student", email },
      };
    }
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const user = mapUser(data.user as Record<string, unknown>);
      const token = extractToken(data.session);
      if (!token) throw new Error("No access token in login response");
      return { token, user };
    } catch (error: unknown) {
      const axiosErr = error as {
        response?: { data?: { error?: string } };
        message?: string;
        code?: string;
      };
      if (!axiosErr.response) {
        throw new Error(
          `Cannot reach API at ${API_BASE_URL}. Start the backend: cd backend-issue && npm start`,
        );
      }
      throw new Error(axiosErr.response.data?.error ?? axiosErr.message ?? "Login failed");
    }
  },
  register: async (name: string, email: string, password: string) => {
    if (!isBrowser || !API_BASE_URL) {
      return { token: `local.${btoa(email)}`, user: { id: "local-user", name, email } };
    }
    const { data } = await api.post("/auth/register", { name, email, password });
    const user = mapUser(data.user as Record<string, unknown>);
    const token = extractToken(data.session);
    if (!token) throw new Error("No access token in register response");
    return { token, user };
  },
  me: () =>
    withFallback<User | null>(
      async () => {
        const { data } = await api.get("/auth/me");
        return mapUser(data.user as Record<string, unknown>);
      },
      () => null,
    ),
};

export const issueService = {
  list: () =>
    withFallback<Issue[]>(
      async () => {
        const { data } = await api.get<{ issues: BackendIssueRow[] }>("/issues/mine");
        const user = (await authService.me()) ?? undefined;
        return (data.issues ?? []).map((row) => mapIssue(row, [], user?.id));
      },
      () => localStore.issues(),
    ),
  get: (ticketId: string) =>
    withFallback<Issue | null>(
      async () => {
        const issueUuid = await resolveIssueUuid(ticketId);
        if (!issueUuid) return null;

        const { data } = await api.get<{
          issue: BackendIssueRow;
          activity: BackendActivityRow[];
        }>(`/issues/${issueUuid}`);

        const user = (await authService.me()) ?? undefined;
        return mapIssue(data.issue, data.activity ?? [], user?.id);
      },
      () => localStore.issues().find((i) => i.ticketId === ticketId) ?? null,
    ),
  aiSuggest: (payload: { title: string; description: string; imageCount: number }) =>
    withFallback<AiSuggestion | null>(
      async () => {
        const { data } = await api.post("/ai/analyze-issue", {
          title: payload.title,
          description: payload.description,
        });
        const suggestions = data.suggestions as {
          category?: string;
          priority?: string;
          description?: string;
          disclaimer?: string;
        };
        if (!suggestions) return null;
        const priority =
          suggestions.priority === "LOW" ||
          suggestions.priority === "MEDIUM" ||
          suggestions.priority === "HIGH"
            ? suggestions.priority
            : undefined;
        return {
          category: suggestions.category,
          priority: priority as Priority | undefined,
          reason: suggestions.disclaimer ?? suggestions.description ?? "AI suggestion available",
        };
      },
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
  checkDuplicate: (payload: {
    title: string;
    category: string;
    location: string;
    gps?: { lat: number; lng: number } | null;
  }) =>
    withFallback<DuplicateMatch | null>(
      async () => {
        const { data } = await api.post("/issues/check-duplicate", {
          title: payload.title,
          category: payload.category,
          description: payload.title,
          latitude: payload.gps?.lat,
          longitude: payload.gps?.lng,
        });
        if (!data.duplicateFound || !data.match) return null;
        return mapDuplicateMatch(data.match);
      },
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
      async () => {
        const issueUuid = await resolveIssueUuid(ticketId);
        if (!issueUuid) throw new Error("Issue not found");
        await api.post(`/issues/${issueUuid}/follow`);
        return { ok: true } as const;
      },
      () => {
        localStore.updateIssue(ticketId, { followed: true });
        return { ok: true } as const;
      },
    ),
  create: (form: FormData, draft: Record<string, unknown>) =>
    withFallback<Issue>(
      async () => {
        const { data } = await api.post<{ issue: BackendIssueRow }>("/issues", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const user = (await authService.me()) ?? undefined;
        return mapIssue(data.issue, [], user?.id);
      },
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
      async () => {
        const issueUuid = await resolveIssueUuid(ticketId);
        if (!issueUuid) return null;
        const { data } = await api.post<{ issue: BackendIssueRow }>(
          `/issues/${issueUuid}/verify`,
        );
        const user = (await authService.me()) ?? undefined;
        return mapIssue(data.issue, [], user?.id);
      },
      () =>
        localStore.updateIssue(ticketId, {
          status: "VERIFIED" as IssueStatus,
          timeline: buildTimeline("VERIFIED", { VERIFIED: "Verified by reporter" }),
        }),
    ),
  reopen: (ticketId: string, reason: string) =>
    withFallback<Issue | null>(
      async () => {
        const issueUuid = await resolveIssueUuid(ticketId);
        if (!issueUuid) return null;
        const { data } = await api.post<{ issue: BackendIssueRow }>(
          `/issues/${issueUuid}/reopen`,
          { comment: reason },
        );
        const user = (await authService.me()) ?? undefined;
        return mapIssue(data.issue, [], user?.id);
      },
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
      async () => {
        const { data } = await api.get<{ notifications: BackendNotificationRow[] }>(
          "/notifications",
        );
        return (data.notifications ?? []).map((row) => mapNotification(row));
      },
      () => localStore.notifications(),
    ),
  markRead: (id: string) =>
    withFallback<{ ok: true }>(
      async () => {
        await api.patch(`/notifications/${id}/read`);
        return { ok: true } as const;
      },
      () => {
        localStore.saveNotifications(
          localStore.notifications().map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        return { ok: true } as const;
      },
    ),
  markAllRead: () =>
    withFallback<{ ok: true }>(
      async () => {
        const list = await notificationService.list();
        await Promise.all(list.filter((n) => !n.read).map((n) => notificationService.markRead(n.id)));
        return { ok: true } as const;
      },
      () => {
        localStore.saveNotifications(localStore.notifications().map((n) => ({ ...n, read: true })));
        return { ok: true } as const;
      },
    ),
};
