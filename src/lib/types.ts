import type { IssueStatus, Priority } from "./constants";

export interface User {
  id: string;
  name: string;
  email: string;
  studentId?: string | undefined;
  department?: string | undefined;
}

export interface TimelineStep {
  status: IssueStatus;
  at: string | null;
  action?: string | undefined;
  department?: string | undefined;
  comment?: string | undefined;
  done: boolean;
}

export interface Issue {
  id: string;
  ticketId: string;
  title: string;
  description: string;
  category: string;
  location: string;
  gps?: { lat: number; lng: number } | null | undefined;
  priority: Priority;
  status: IssueStatus;
  createdAt: string;
  images: string[];
  video?: string | null | undefined;
  followed?: boolean | undefined;
  timeline: TimelineStep[];
  resolution?: {
    comment: string;
    image?: string | null | undefined;
    resolvedAt: string;
    department?: string | undefined;
  } | null;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  ticketId?: string;
  createdAt: string;
  read: boolean;
}

export interface AiSuggestion {
  category?: string | undefined;
  priority?: Priority | undefined;
  title?: string | undefined;
  reason: string;
}

export interface DuplicateMatch {
  ticketId: string;
  title: string;
  location: string;
  status: IssueStatus;
  createdAt: string;
}
