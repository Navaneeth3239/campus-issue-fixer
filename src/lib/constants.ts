export const CATEGORIES = [
  "Electrical",
  "Plumbing",
  "Water Leakage",
  "Wi-Fi/Network",
  "Infrastructure",
  "Furniture",
  "Classroom",
  "Laboratory",
  "Hostel",
  "Cleanliness",
  "Safety",
  "IT Equipment",
  "Other",
] as const;

export const LOCATIONS = [
  "Block A",
  "Block B",
  "Laboratory",
  "Library",
  "Hostel",
  "Canteen",
  "Playground",
  "Parking Area",
] as const;

export type Priority = "LOW" | "MEDIUM" | "HIGH";

export const PRIORITIES: { value: Priority; label: string; help: string }[] = [
  {
    value: "LOW",
    label: "Low",
    help: "Minor inconvenience. Can wait a few days without affecting studies.",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    help: "Disrupts daily activity. Should be handled within 24-48 hours.",
  },
  {
    value: "HIGH",
    label: "High",
    help: "Safety risk or complete blockage. Needs immediate attention.",
  },
];

export const PRIORITY_STYLES: Record<Priority, string> = {
  LOW: "bg-info/15 text-info border-info/30",
  MEDIUM: "bg-warning/15 text-warning border-warning/30",
  HIGH: "bg-danger/15 text-danger border-danger/30",
};

export const STATUS_FLOW = [
  "REPORTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "VERIFIED",
  "CLOSED",
] as const;

export type IssueStatus = (typeof STATUS_FLOW)[number];

export const STATUS_LABELS: Record<IssueStatus, string> = {
  REPORTED: "Reported",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  VERIFIED: "Verified",
  CLOSED: "Closed",
};

export const STATUS_STYLES: Record<IssueStatus, string> = {
  REPORTED: "bg-muted text-muted-foreground border-border",
  ASSIGNED: "bg-info/15 text-info border-info/30",
  IN_PROGRESS: "bg-warning/15 text-warning border-warning/30",
  RESOLVED: "bg-accent/20 text-accent-foreground border-accent/40",
  VERIFIED: "bg-success/15 text-success border-success/30",
  CLOSED: "bg-success/15 text-success border-success/30",
};
