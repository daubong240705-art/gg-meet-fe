"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  Download,
  Filter,
  MoreVertical,
  Search,
  UsersRound,
  Video,
} from "lucide-react";

import { AdminRoleBadge } from "@/components/admin/admin-role-badge";
import { AdminStatCard } from "@/components/admin/admin-stat-card";
import { AdminStatusBadge } from "@/components/admin/admin-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const stats = [
  {
    label: "Total Users",
    value: "2,543",
    change: "+12.5%",
    trend: "up" as const,
    icon: UsersRound,
    tone: "blue" as const,
  },
  {
    label: "Active Meetings",
    value: "128",
    change: "+23.1%",
    trend: "up" as const,
    icon: Video,
    tone: "green" as const,
  },
  {
    label: "Total Meetings Today",
    value: "847",
    change: "-5.2%",
    trend: "down" as const,
    icon: Calendar,
    tone: "violet" as const,
  },
];

const users = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@example.com",
    avatar: "JD",
    role: "Admin",
    status: "active",
    joinDate: "Jan 15, 2026",
    meetings: 145,
  },
  {
    id: 2,
    name: "Sarah Chen",
    email: "sarah.chen@example.com",
    avatar: "SC",
    role: "User",
    status: "active",
    joinDate: "Feb 3, 2026",
    meetings: 89,
  },
  {
    id: 3,
    name: "Michael Kim",
    email: "michael.kim@example.com",
    avatar: "MK",
    role: "User",
    status: "inactive",
    joinDate: "Dec 20, 2025",
    meetings: 234,
  },
  {
    id: 4,
    name: "Emily Rodriguez",
    email: "emily.r@example.com",
    avatar: "ER",
    role: "Moderator",
    status: "active",
    joinDate: "Mar 8, 2026",
    meetings: 67,
  },
  {
    id: 5,
    name: "David Park",
    email: "david.park@example.com",
    avatar: "DP",
    role: "User",
    status: "blocked",
    joinDate: "Nov 12, 2025",
    meetings: 23,
  },
];

type AdminUser = (typeof users)[number];

const meetings = [
  {
    id: 1,
    title: "Team Standup - Engineering",
    host: "John Doe",
    code: "abc-defg-hij",
    status: "ongoing",
    participants: 12,
    startTime: "9:00 AM",
  },
  {
    id: 2,
    title: "Product Review Meeting",
    host: "Sarah Chen",
    code: "xyz-1234-567",
    status: "scheduled",
    participants: 8,
    startTime: "2:30 PM",
  },
  {
    id: 3,
    title: "Client Presentation",
    host: "Michael Kim",
    code: "cli-ent-789",
    status: "completed",
    participants: 15,
    startTime: "11:00 AM",
  },
  {
    id: 4,
    title: "Design Sprint Workshop",
    host: "Emily Rodriguez",
    code: "des-ign-456",
    status: "ongoing",
    participants: 6,
    startTime: "10:15 AM",
  },
  {
    id: 5,
    title: "Weekly All Hands",
    host: "David Park",
    code: "all-hand-123",
    status: "cancelled",
    participants: 0,
    startTime: "3:00 PM",
  },
];

type AdminMeeting = (typeof meetings)[number];

type AdminTab = "users" | "meetings";

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [searchQuery, setSearchQuery] = useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedQuery) {
      return users;
    }

    return users.filter((user) =>
      [user.name, user.email, user.role, user.status].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [normalizedQuery]);

  const filteredMeetings = useMemo(() => {
    if (!normalizedQuery) {
      return meetings;
    }

    return meetings.filter((meeting) =>
      [meeting.title, meeting.host, meeting.code, meeting.status].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
      )
    );
  }, [normalizedQuery]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Dashboard Overview
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Manage users, meetings, and system settings.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <AdminStatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-full rounded-lg border border-border bg-muted p-1 sm:w-fit">
            <Button
              type="button"
              variant={activeTab === "users" ? "secondary" : "ghost"}
              className="flex-1 sm:flex-none"
              onClick={() => setActiveTab("users")}
            >
              <UsersRound className="h-4 w-4" />
              Users
            </Button>
            <Button
              type="button"
              variant={activeTab === "meetings" ? "secondary" : "ghost"}
              className="flex-1 sm:flex-none"
              onClick={() => setActiveTab("meetings")}
            >
              <Video className="h-4 w-4" />
              Meetings
            </Button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative min-w-0 sm:w-72">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search..."
                className="pl-8"
              />
            </div>
            <Button type="button" variant="outline" size="sm">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
            <Button type="button" variant="outline" size="sm">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        {activeTab === "users" ? (
          <UsersTable users={filteredUsers} />
        ) : (
          <MeetingsTable meetings={filteredMeetings} />
        )}
      </section>
    </div>
  );
}

function UsersTable({ users }: { users: AdminUser[] }) {
  return (
    <Card id="users">
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          View and manage all registered users on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-3 pr-4 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Meetings</th>
                <th className="px-4 py-3 font-medium">Join Date</th>
                <th className="py-3 pl-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-border/60 last:border-0">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {user.avatar}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <AdminRoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-4">
                    <AdminStatusBadge status={user.status} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      {user.meetings}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{user.joinDate}</td>
                  <td className="py-4 pl-4 text-right">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="User actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MeetingsTable({ meetings }: { meetings: AdminMeeting[] }) {
  return (
    <Card id="meetings">
      <CardHeader>
        <CardTitle>Meeting Management</CardTitle>
        <CardDescription>
          Monitor and manage all meetings across the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Meeting Title</th>
                <th className="px-4 py-3 font-medium">Host</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Participants</th>
                <th className="px-4 py-3 font-medium">Meeting Code</th>
                <th className="py-3 pl-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {meetings.map((meeting) => (
                <tr key={meeting.id} className="border-b border-border/60 last:border-0">
                  <td className="py-4 pr-4">
                    <p className="font-medium">{meeting.title}</p>
                    <p className="text-muted-foreground">{meeting.startTime}</p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">{meeting.host}</td>
                  <td className="px-4 py-4">
                    <AdminStatusBadge status={meeting.status} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-2">
                      <UsersRound className="h-4 w-4 text-muted-foreground" />
                      {meeting.participants}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <code className="rounded bg-muted px-2 py-1 text-xs">
                      {meeting.code}
                    </code>
                  </td>
                  <td className="py-4 pl-4 text-right">
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Meeting actions">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
