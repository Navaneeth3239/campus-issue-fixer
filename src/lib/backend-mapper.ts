import { STATUS_FLOW, type IssueStatus } from "./constants";
import { buildTimeline } from "./local-store";
import type { AppNotification, DuplicateMatch, Issue, TimelineStep, User } from "./types";

/** Raw issue row from Supabase / backend API (snake_case). */
export interface BackendIssueRow {
  id: string;
  ticket_id: string;
  reporter_id?: string;
  title: string;
  description?: string | null;
  category?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priority?: string | null;
  status: string;
  images?: string[] | null;
  videos?: string[] | null;
  created_at: string;
  resolved_at?: string | null;
  followers?: string[] | null;
}

export interface BackendActivityRow {
  action: string;
  old_value?: string | null;
  new_value?: string | null;
  comment?: string | null;
  created_at: string;
}

export interface BackendNotificationRow {
  id: string;
  user_id: string;
  issue_id?: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

const EXTENDED_STATUSES = ["REOPENED", "OVERDUE", "ESCALATED"] as const;

export function normalizeIssueStatus(status: string): IssueStatus {
  if ((STATUS_FLOW as readonly string[]).includes(status)) {
    return status as IssueStatus;
  }
  if (EXTENDED_STATUSES.includes(status as typeof EXTENDED_STATUSES[number])) {
    return status as IssueStatus;
  }
  return "REPORTED";
}

function timelineAnchorStatus(status: IssueStatus): IssueStatus {
  if (status === "REOPENED" || status === "OVERDUE" || status === "ESCALATED") {
    return "IN_PROGRESS";
  }
  if ((STATUS_FLOW as readonly string[]).includes(status)) {
    return status;
  }
  return "REPORTED";
}

function buildTimelineFromActivity(
  status: IssueStatus,
  activity: BackendActivityRow[],
): TimelineStep[] {
  const anchor = timelineAnchorStatus(status);
  const meta: Record<string, string> = {};
  for (const entry of activity) {
    const key = entry.new_value ?? entry.action;
    if (key) {
      meta[key] = entry.comment ?? entry.action;
    }
  }

  const steps = buildTimeline(anchor, meta);

  for (const step of steps) {
    const match = activity.find(
      (a) => a.new_value === step.status || a.action === step.status,
    );
    if (match) {
      step.at = match.created_at;
      if (match.comment) step.comment = match.comment;
    }
  }

  return steps;
}

export function mapUser(row: Record<string, unknown>): User {
  return {
    id: String(row["id"] ?? ""),
    name: String(row["name"] ?? ""),
    email: String(row["email"] ?? ""),
  };
}

export function mapIssue(
  row: BackendIssueRow,
  activity: BackendActivityRow[] = [],
  currentUserId?: string,
): Issue {
  const status = normalizeIssueStatus(row.status);
  const priority =
    row.priority === "LOW" || row.priority === "MEDIUM" || row.priority === "HIGH"
      ? row.priority
      : "MEDIUM";

  const followed =
    currentUserId &&
    row.reporter_id !== currentUserId &&
    Array.isArray(row.followers) &&
    row.followers.includes(currentUserId);

  return {
    id: row.id,
    ticketId: row.ticket_id,
    title: row.title,
    description: row.description ?? "",
    category: row.category ?? "Other",
    location: row.location ?? "",
    gps:
      row.latitude != null && row.longitude != null
        ? { lat: row.latitude, lng: row.longitude }
        : null,
    priority,
    status,
    createdAt: row.created_at,
    images: row.images ?? [],
    video: row.videos?.[0] ?? null,
    followed: followed ?? false,
    timeline: buildTimelineFromActivity(status, activity),
    resolution:
      status === "RESOLVED" || row.resolved_at
        ? {
            comment: "The department marked this issue as resolved.",
            resolvedAt: row.resolved_at ?? row.created_at,
          }
        : null,
  };
}

export function mapDuplicateMatch(match: {
  issueId?: string;
  ticketId?: string;
  title?: string;
  status?: string;
  confidence?: number;
}): DuplicateMatch | null {
  if (!match.ticketId) return null;
  return {
    ticketId: match.ticketId,
    title: match.title ?? "",
    location: "",
    status: normalizeIssueStatus(match.status ?? "REPORTED"),
    createdAt: new Date().toISOString(),
  };
}

export function mapNotification(
  row: BackendNotificationRow,
  ticketId?: string,
): AppNotification {
  return {
    id: row.id,
    title: "CampSolver",
    body: row.message,
    ticketId: ticketId ?? undefined,
    createdAt: row.created_at,
    read: row.read,
  };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
