import type { AppNotification, Issue } from "./types";
import { STATUS_FLOW } from "./constants";

const ISSUES_KEY = "campsolver.issues";
const NOTIFS_KEY = "campsolver.notifications";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function buildTimeline(upTo: string, meta: Record<string, string> = {}) {
  const idx = STATUS_FLOW.indexOf(upTo as (typeof STATUS_FLOW)[number]);
  return STATUS_FLOW.map((status, i) => ({
    status,
    done: i <= idx,
    at: i <= idx ? new Date(Date.now() - (idx - i) * 36e5).toISOString() : null,
    action: i <= idx ? meta[status] : undefined,
    department: i > 0 && i <= idx ? "Maintenance Dept." : undefined,
    comment: undefined,
  }));
}

export function makeTicketId() {
  const n = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `CS-${new Date().getFullYear()}-${n}`;
}

const seedIssues: Issue[] = [
  {
    id: "seed-1",
    ticketId: "CS-2026-10241",
    title: "Water leakage near Block B staircase",
    description: "Continuous leakage from the ceiling pipe making the stairs slippery.",
    category: "Water Leakage",
    location: "Block B",
    gps: null,
    priority: "HIGH",
    status: "IN_PROGRESS",
    createdAt: new Date(Date.now() - 2 * 864e5).toISOString(),
    images: [],
    timeline: buildTimeline("IN_PROGRESS", {
      REPORTED: "Ticket created by student",
      ASSIGNED: "Assigned to plumbing team",
      IN_PROGRESS: "Technician on site",
    }),
    resolution: null,
  },
  {
    id: "seed-2",
    ticketId: "CS-2026-10188",
    title: "Projector not working in Lab 3",
    description: "HDMI port damaged, no display output during lab sessions.",
    category: "IT Equipment",
    location: "Laboratory",
    gps: null,
    priority: "MEDIUM",
    status: "RESOLVED",
    createdAt: new Date(Date.now() - 5 * 864e5).toISOString(),
    images: [],
    timeline: buildTimeline("RESOLVED", {
      REPORTED: "Ticket created by student",
      ASSIGNED: "Assigned to IT support",
      IN_PROGRESS: "Cable replacement in progress",
      RESOLVED: "Projector restored",
    }),
    resolution: {
      comment: "HDMI cable and port module replaced. Tested with two laptops.",
      image: null,
      resolvedAt: new Date(Date.now() - 6 * 36e5).toISOString(),
      department: "IT Support",
    },
  },
  {
    id: "seed-3",
    ticketId: "CS-2026-10099",
    title: "Broken bench in Library reading hall",
    description: "Bench leg cracked, unsafe to sit.",
    category: "Furniture",
    location: "Library",
    gps: null,
    priority: "LOW",
    status: "CLOSED",
    createdAt: new Date(Date.now() - 12 * 864e5).toISOString(),
    images: [],
    followed: true,
    timeline: buildTimeline("CLOSED", { REPORTED: "Ticket created by student" }),
    resolution: null,
  },
];

const seedNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "Status updated",
    body: "CS-2026-10241 moved to In Progress.",
    ticketId: "CS-2026-10241",
    createdAt: new Date(Date.now() - 36e5).toISOString(),
    read: false,
  },
  {
    id: "n2",
    title: "Action needed",
    body: "CS-2026-10188 is resolved. Please verify the fix.",
    ticketId: "CS-2026-10188",
    createdAt: new Date(Date.now() - 6 * 36e5).toISOString(),
    read: false,
  },
];

export const localStore = {
  issues(): Issue[] {
    const stored = read<Issue[] | null>(ISSUES_KEY, null);
    if (Array.isArray(stored)) return stored;
    write(ISSUES_KEY, seedIssues);
    return seedIssues;
  },
  saveIssues(issues: Issue[]) {
    write(ISSUES_KEY, issues);
  },
  addIssue(issue: Issue) {
    const all = [issue, ...localStore.issues()];
    write(ISSUES_KEY, all);
    return issue;
  },
  updateIssue(ticketId: string, patch: Partial<Issue>) {
    const all = localStore.issues().map((i) => (i.ticketId === ticketId ? { ...i, ...patch } : i));
    write(ISSUES_KEY, all);
    return all.find((i) => i.ticketId === ticketId) ?? null;
  },
  notifications(): AppNotification[] {
    const stored = read<AppNotification[] | null>(NOTIFS_KEY, null);
    if (Array.isArray(stored)) return stored;
    write(NOTIFS_KEY, seedNotifications);
    return seedNotifications;
  },
  saveNotifications(list: AppNotification[]) {
    write(NOTIFS_KEY, list);
  },
};
