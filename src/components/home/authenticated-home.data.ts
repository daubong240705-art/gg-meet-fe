import { Clock, Users, Video } from "lucide-react";

import type { MeetingStat, RecentMeeting, UpcomingMeeting } from "./authenticated-home.types";

export const quickStats: MeetingStat[] = [
  {
    label: "Meetings this week",
    value: "12",
    change: "+3 from last week",
    icon: Video,
    trend: "up",
  },
  {
    label: "Total hours",
    value: "8.5h",
    change: "Average 1.7h/day",
    icon: Clock,
    trend: "neutral",
  },
  {
    label: "Participants met",
    value: "47",
    change: "+12 this week",
    icon: Users,
    trend: "up",
  },
];

export const upcomingMeetings: UpcomingMeeting[] = [
  {
    id: 1,
    title: "Team Standup - Engineering",
    time: "Today, 10:00 AM",
    timeRemaining: "Starts in 25 min",
    participants: 8,
    code: "abc-defg-hij",
    host: "You",
    isUrgent: true,
    avatars: ["JD", "SC", "MK", "AL"],
  },
  {
    id: 2,
    title: "Product Review & Planning",
    time: "Today, 2:30 PM",
    timeRemaining: "In 4 hours",
    participants: 12,
    code: "xyz-1234-567",
    host: "Sarah Chen",
    avatars: ["SC", "JD", "TP", "RW"],
  },
  {
    id: 3,
    title: "Client Presentation - Q1 Results",
    time: "Tomorrow, 11:00 AM",
    timeRemaining: "Tomorrow",
    participants: 6,
    code: "cli-ent-789",
    host: "You",
    avatars: ["JD", "MK", "AL"],
  },
];

export const recentMeetings: RecentMeeting[] = [
  {
    id: 1,
    title: "Sprint Planning Session",
    date: "Apr 14, 2026",
    duration: "45 min",
    participants: 10,
    code: "spr-int-123",
  },
  {
    id: 2,
    title: "Design Review - Mobile App",
    date: "Apr 13, 2026",
    duration: "30 min",
    participants: 5,
    code: "des-ign-456",
  },
  {
    id: 3,
    title: "1-on-1 with Manager",
    date: "Apr 12, 2026",
    duration: "25 min",
    participants: 2,
    code: "one-on1-789",
  },
  {
    id: 4,
    title: "Marketing Campaign Review",
    date: "Apr 11, 2026",
    duration: "50 min",
    participants: 8,
    code: "mrk-tng-321",
  },
];
