import type { LucideIcon } from "lucide-react";

export type MeetingStat = {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  trend?: "up" | "neutral";
};

export type RecentMeeting = {
  id: number;
  title: string;
  date: string;
  duration: string;
  participants: number;
  code: string;
};
