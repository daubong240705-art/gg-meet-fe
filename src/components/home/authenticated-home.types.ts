import type { LucideIcon } from "lucide-react";

export type MeetingStat = {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend?: "up" | "neutral";
};

export type UpcomingMeeting = {
  id: number;
  title: string;
  time: string;
  timeRemaining: string;
  participants: number;
  code: string;
  host: string;
  isUrgent?: boolean;
  avatars: string[];
};

export type RecentMeeting = {
  id: number;
  title: string;
  date: string;
  duration: string;
  participants: number;
  code: string;
};
