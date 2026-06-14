"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Filter,
  Power,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  UsersRound,
  Video,
} from "lucide-react";

import { AdminPagination } from "@/components/admin/admin-pagination";
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
import {
  useAdminActions,
  useAdminMeetings,
  useAdminOverview,
  useAdminUsers,
} from "@/features/admin/hooks";
import { defineAppAbility } from "@/lib/auth/ability";
import { useAuthSession } from "@/lib/auth/auth-session";
import { getAvatarInitials } from "@/lib/user/avatar";
import type {
  AdminMeeting,
  AdminMeetingStatus,
  AdminMetric,
  AdminPaged,
  AdminUser,
  AdminUserRole,
  AdminUserStatus,
} from "@/shared/services/admin.service";

type AdminTab = "users" | "meetings";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 350;
const subscribeToHydration = () => () => undefined;

const selectClassName =
  "h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeoutId);
  }, [delayMs, value]);

  return debouncedValue;
}

function useHasHydrated() {
  return useSyncExternalStore(subscribeToHydration, () => true, () => false);
}

const formatNumber = (value?: number | null) =>
  typeof value === "number" && Number.isFinite(value) ? value.toLocaleString() : "—";

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
};

const formatTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : timeFormatter.format(date);
};

const toStartOfDay = (date: string) => (date ? `${date}T00:00:00` : undefined);
const toEndOfDay = (date: string) => (date ? `${date}T23:59:59` : undefined);

const getMetricChange = (metric?: AdminMetric | null) => metric?.change?.trim() || "+0.0%";
const getMetricTrend = (metric?: AdminMetric | null): "up" | "down" =>
  metric?.trend === "down" ? "down" : "up";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  const apiError = error as Partial<IBackendRes<unknown>>;

  if (typeof apiError.message === "string" && apiError.message.trim()) {
    return apiError.message;
  }

  if (typeof apiError.error === "string" && apiError.error.trim()) {
    return apiError.error;
  }

  if (typeof apiError.errors === "string" && apiError.errors.trim()) {
    return apiError.errors;
  }

  return "Please try again in a moment.";
};

export function AdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthSession();
  const ability = useMemo(() => defineAppAbility(user?.role ?? null), [user?.role]);
  const canAccessAdmin = ability.can("read", "AdminPanel");
  const hasMounted = useHasHydrated();
  const [activeTab, setActiveTab] = useState<AdminTab>("users");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery.trim(), SEARCH_DEBOUNCE_MS);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [usersPage, setUsersPage] = useState(0);
  const [meetingsPage, setMeetingsPage] = useState(0);
  const [userRole, setUserRole] = useState<AdminUserRole | "">("");
  const [userStatus, setUserStatus] = useState<AdminUserStatus | "">("");
  const [meetingStatus, setMeetingStatus] = useState<AdminMeetingStatus | "">("");
  const [meetingFromDate, setMeetingFromDate] = useState("");
  const [meetingToDate, setMeetingToDate] = useState("");

  useEffect(() => {
    if (!hasMounted) return;

    if (!isAuthenticated) {
      router.replace("/sign-in");
      return;
    }

    if (!canAccessAdmin) {
      router.replace("/");
    }
  }, [canAccessAdmin, hasMounted, isAuthenticated, router]);

  const canLoadAdminData = hasMounted && isAuthenticated && canAccessAdmin;
  const meetingFrom = useMemo(() => toStartOfDay(meetingFromDate), [meetingFromDate]);
  const meetingTo = useMemo(() => toEndOfDay(meetingToDate), [meetingToDate]);

  const overviewQuery = useAdminOverview({ enabled: canLoadAdminData });
  const adminActions = useAdminActions();
  const usersQuery = useAdminUsers(
    {
      page: usersPage,
      size: PAGE_SIZE,
      search: debouncedSearch,
      role: userRole,
      status: userStatus,
    },
    { enabled: canLoadAdminData },
  );
  const meetingsQuery = useAdminMeetings(
    {
      page: meetingsPage,
      size: PAGE_SIZE,
      search: debouncedSearch,
      status: meetingStatus,
      from: meetingFrom,
      to: meetingTo,
    },
    { enabled: canLoadAdminData },
  );

  const stats = useMemo(
    () => [
      {
        label: "Total Users",
        value: formatNumber(overviewQuery.data?.totalUsers?.value),
        change: getMetricChange(overviewQuery.data?.totalUsers),
        trend: getMetricTrend(overviewQuery.data?.totalUsers),
        icon: UsersRound,
        tone: "blue" as const,
      },
      {
        label: "Active Meetings",
        value: formatNumber(overviewQuery.data?.activeMeetings?.value),
        change: getMetricChange(overviewQuery.data?.activeMeetings),
        trend: getMetricTrend(overviewQuery.data?.activeMeetings),
        icon: Video,
        tone: "green" as const,
      },
      {
        label: "Total Meetings Today",
        value: formatNumber(overviewQuery.data?.totalMeetingsToday?.value),
        change: getMetricChange(overviewQuery.data?.totalMeetingsToday),
        trend: getMetricTrend(overviewQuery.data?.totalMeetingsToday),
        icon: Calendar,
        tone: "violet" as const,
      },
    ],
    [overviewQuery.data],
  );

  const activeUserActionId =
    adminActions.banUser.isPending
      ? adminActions.banUser.variables?.userId ?? null
      : adminActions.unbanUser.isPending
        ? adminActions.unbanUser.variables?.userId ?? null
        : adminActions.updateUserRole.isPending
          ? adminActions.updateUserRole.variables?.userId ?? null
          : null;
  const activeMeetingActionId = adminActions.forceEndMeeting.isPending
    ? adminActions.forceEndMeeting.variables?.meetingId ?? null
    : null;

  if (!hasMounted) {
    return <AdminAccessState title="Checking access" description="Preparing admin workspace." />;
  }

  if (!isAuthenticated) {
    return <AdminAccessState title="Redirecting" description="Sign in with an admin account to continue." />;
  }

  if (!canAccessAdmin) {
    return <AdminAccessState title="Forbidden" description="Your account does not have access to this workspace." />;
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setUsersPage(0);
    setMeetingsPage(0);
  };

  const handleUserRoleChange = (value: AdminUserRole | "") => {
    setUserRole(value);
    setUsersPage(0);
  };

  const handleUserStatusChange = (value: AdminUserStatus | "") => {
    setUserStatus(value);
    setUsersPage(0);
  };

  const handleMeetingStatusChange = (value: AdminMeetingStatus | "") => {
    setMeetingStatus(value);
    setMeetingsPage(0);
  };

  const handleMeetingFromDateChange = (value: string) => {
    setMeetingFromDate(value);
    setMeetingsPage(0);
  };

  const handleMeetingToDateChange = (value: string) => {
    setMeetingToDate(value);
    setMeetingsPage(0);
  };

  const clearActiveFilters = () => {
    if (activeTab === "users") {
      setUserRole("");
      setUserStatus("");
      setUsersPage(0);
      return;
    }

    setMeetingStatus("");
    setMeetingFromDate("");
    setMeetingToDate("");
    setMeetingsPage(0);
  };

  const getUserLabel = (adminUser: AdminUser) =>
    adminUser.fullName?.trim() || adminUser.email?.trim() || `User #${adminUser.id}`;

  const handleToggleUserBan = (adminUser: AdminUser) => {
    const label = getUserLabel(adminUser);
    const isBanned = Boolean(adminUser.isBanned);
    const confirmed = window.confirm(
      isBanned
        ? `Unban ${label}? They will be able to sign in again.`
        : `Ban ${label}? Their active tokens will be invalidated immediately.`,
    );

    if (!confirmed) {
      return;
    }

    if (isBanned) {
      adminActions.unbanUser.mutate({ userId: adminUser.id, label });
      return;
    }

    adminActions.banUser.mutate({ userId: adminUser.id, label });
  };

  const handleToggleUserRole = (adminUser: AdminUser) => {
    const label = getUserLabel(adminUser);
    const currentRole = adminUser.role?.toString().trim().toUpperCase();
    const nextRole: AdminUserRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    const confirmed = window.confirm(
      `Change ${label}'s role to ${nextRole === "ADMIN" ? "Admin" : "User"}?`,
    );

    if (!confirmed) {
      return;
    }

    adminActions.updateUserRole.mutate({
      userId: adminUser.id,
      role: nextRole,
      label,
    });
  };

  const handleForceEndMeeting = (meeting: AdminMeeting) => {
    const title = meeting.title?.trim() || meeting.meetingCode?.trim() || `Meeting #${meeting.id}`;
    const confirmed = window.confirm(
      `Force-end ${title}? All participants will be disconnected from this meeting.`,
    );

    if (!confirmed) {
      return;
    }

    adminActions.forceEndMeeting.mutate({
      meetingId: meeting.id,
      label: title,
    });
  };

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
        {overviewQuery.isPending ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          stats.map((stat) => <AdminStatCard key={stat.label} {...stat} />)
        )}
      </section>

      {overviewQuery.isError ? (
        <InlineError
          title="Unable to load overview"
          description={getErrorMessage(overviewQuery.error)}
          onRetry={() => overviewQuery.refetch()}
        />
      ) : null}

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
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={activeTab === "users" ? "Search users..." : "Search meetings..."}
                className="pl-8"
              />
            </div>
            <Button
              type="button"
              variant={isFilterOpen ? "secondary" : "outline"}
              size="sm"
              aria-expanded={isFilterOpen}
              onClick={() => setIsFilterOpen((isOpen) => !isOpen)}
            >
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {isFilterOpen ? (
          <AdminFilterPanel
            activeTab={activeTab}
            userRole={userRole}
            userStatus={userStatus}
            meetingStatus={meetingStatus}
            meetingFromDate={meetingFromDate}
            meetingToDate={meetingToDate}
            onUserRoleChange={handleUserRoleChange}
            onUserStatusChange={handleUserStatusChange}
            onMeetingStatusChange={handleMeetingStatusChange}
            onMeetingFromDateChange={handleMeetingFromDateChange}
            onMeetingToDateChange={handleMeetingToDateChange}
            onClear={clearActiveFilters}
          />
        ) : null}

        {activeTab === "users" ? (
          <UsersTable
            data={usersQuery.data}
            isLoading={usersQuery.isPending}
            isFetching={usersQuery.isFetching}
            isError={usersQuery.isError}
            error={usersQuery.error}
            page={usersPage}
            activeActionUserId={activeUserActionId}
            onToggleBan={handleToggleUserBan}
            onToggleRole={handleToggleUserRole}
            onPageChange={setUsersPage}
            onRetry={() => usersQuery.refetch()}
          />
        ) : (
          <MeetingsTable
            data={meetingsQuery.data}
            isLoading={meetingsQuery.isPending}
            isFetching={meetingsQuery.isFetching}
            isError={meetingsQuery.isError}
            error={meetingsQuery.error}
            page={meetingsPage}
            activeActionMeetingId={activeMeetingActionId}
            onForceEndMeeting={handleForceEndMeeting}
            onPageChange={setMeetingsPage}
            onRetry={() => meetingsQuery.refetch()}
          />
        )}
      </section>
    </div>
  );
}

function AdminAccessState({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-xl items-center justify-center">
      <div className="flex w-full flex-col items-center gap-4 rounded-xl border border-border bg-card p-6 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="h-11 w-11 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-14 animate-pulse rounded bg-muted" />
        </div>
        <div className="mt-5 space-y-2">
          <div className="h-8 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

function InlineError({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
      <span className="inline-flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          <span className="font-medium">{title}</span>
          <span className="block text-destructive/80">{description}</span>
        </span>
      </span>
      <Button type="button" variant="destructive" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

function AdminFilterPanel({
  activeTab,
  userRole,
  userStatus,
  meetingStatus,
  meetingFromDate,
  meetingToDate,
  onUserRoleChange,
  onUserStatusChange,
  onMeetingStatusChange,
  onMeetingFromDateChange,
  onMeetingToDateChange,
  onClear,
}: {
  activeTab: AdminTab;
  userRole: AdminUserRole | "";
  userStatus: AdminUserStatus | "";
  meetingStatus: AdminMeetingStatus | "";
  meetingFromDate: string;
  meetingToDate: string;
  onUserRoleChange: (value: AdminUserRole | "") => void;
  onUserStatusChange: (value: AdminUserStatus | "") => void;
  onMeetingStatusChange: (value: AdminMeetingStatus | "") => void;
  onMeetingFromDateChange: (value: string) => void;
  onMeetingToDateChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
      {activeTab === "users" ? (
        <>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Role</span>
            <select
              value={userRole}
              onChange={(event) => onUserRoleChange(event.target.value as AdminUserRole | "")}
              className={selectClassName}
            >
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="USER">User</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <select
              value={userStatus}
              onChange={(event) => onUserStatusChange(event.target.value as AdminUserStatus | "")}
              className={selectClassName}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </label>
        </>
      ) : (
        <>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Status</span>
            <select
              value={meetingStatus}
              onChange={(event) => onMeetingStatusChange(event.target.value as AdminMeetingStatus | "")}
              className={selectClassName}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Ongoing</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="ENDED">Completed</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">From</span>
            <Input
              type="date"
              value={meetingFromDate}
              onChange={(event) => onMeetingFromDateChange(event.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-sm">
            <span className="text-xs font-medium text-muted-foreground">To</span>
            <Input
              type="date"
              value={meetingToDate}
              onChange={(event) => onMeetingToDateChange(event.target.value)}
            />
          </label>
        </>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onClear}>
        Clear filters
      </Button>
    </div>
  );
}

function UsersTable({
  data,
  isLoading,
  isFetching,
  isError,
  error,
  page,
  activeActionUserId,
  onToggleBan,
  onToggleRole,
  onPageChange,
  onRetry,
}: {
  data?: AdminPaged<AdminUser>;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  page: number;
  activeActionUserId: number | null;
  onToggleBan: (user: AdminUser) => void;
  onToggleRole: (user: AdminUser) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}) {
  const users = data?.content ?? [];

  return (
    <Card id="users">
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          View and manage all registered users on the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`overflow-x-auto transition-opacity ${isFetching && !isLoading ? "opacity-70" : ""}`}>
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
              {isLoading ? (
                <TableSkeletonRows columns={6} />
              ) : isError ? (
                <TableStateRow columns={6} title="Unable to load users" description={getErrorMessage(error)} onRetry={onRetry} />
              ) : users.length === 0 ? (
                <TableStateRow columns={6} title="No users found" description="Try changing search or filters." />
              ) : (
                users.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    isActionPending={activeActionUserId === user.id}
                    onToggleBan={onToggleBan}
                    onToggleRole={onToggleRole}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {data ? (
          <AdminPagination
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            isFetching={isFetching}
            onPageChange={onPageChange}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function UserRow({
  user,
  isActionPending,
  onToggleBan,
  onToggleRole,
}: {
  user: AdminUser;
  isActionPending: boolean;
  onToggleBan: (user: AdminUser) => void;
  onToggleRole: (user: AdminUser) => void;
}) {
  const fullName = user.fullName?.trim() || user.email?.trim() || "Unknown user";
  const email = user.email?.trim() || "—";
  const isBanned = Boolean(user.isBanned);
  const normalizedRole = user.role?.toString().trim().toUpperCase();
  const nextRoleLabel = normalizedRole === "ADMIN" ? "Make User" : "Make Admin";

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-4 pr-4">
        <div className="flex items-center gap-3">
          <UserAvatar name={fullName} email={email} avatar={user.avatar} />
          <div>
            <p className="font-medium">{fullName}</p>
            <p className="text-muted-foreground">{email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <AdminRoleBadge role={user.role || "USER"} />
      </td>
      <td className="px-4 py-4">
        <AdminStatusBadge kind="user" status={isBanned ? "BANNED" : user.status || "INACTIVE"} />
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex items-center gap-2">
          <Video className="h-4 w-4 text-muted-foreground" />
          {(user.meetingCount ?? 0).toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-4 text-muted-foreground">{formatDate(user.createdAt)}</td>
      <td className="py-4 pl-4 text-right">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isActionPending}
            onClick={() => onToggleRole(user)}
          >
            <Shield className="h-4 w-4" />
            {nextRoleLabel}
          </Button>
          <Button
            type="button"
            variant={isBanned ? "outline" : "destructive"}
            size="sm"
            disabled={isActionPending}
            onClick={() => onToggleBan(user)}
          >
            {isBanned ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
            {isBanned ? "Unban" : "Ban"}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function UserAvatar({
  name,
  email,
  avatar,
}: {
  name: string;
  email: string;
  avatar?: string | null;
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const avatarUrl = avatar?.trim();
  const initials = getAvatarInitials(name || email, "U");

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-medium text-primary">
      {avatarUrl && !hasImageError ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

function MeetingsTable({
  data,
  isLoading,
  isFetching,
  isError,
  error,
  page,
  activeActionMeetingId,
  onForceEndMeeting,
  onPageChange,
  onRetry,
}: {
  data?: AdminPaged<AdminMeeting>;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  page: number;
  activeActionMeetingId: number | null;
  onForceEndMeeting: (meeting: AdminMeeting) => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}) {
  const meetings = data?.content ?? [];

  return (
    <Card id="meetings">
      <CardHeader>
        <CardTitle>Meeting Management</CardTitle>
        <CardDescription>
          Monitor and manage all meetings across the platform.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={`overflow-x-auto transition-opacity ${isFetching && !isLoading ? "opacity-70" : ""}`}>
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
              {isLoading ? (
                <TableSkeletonRows columns={6} />
              ) : isError ? (
                <TableStateRow columns={6} title="Unable to load meetings" description={getErrorMessage(error)} onRetry={onRetry} />
              ) : meetings.length === 0 ? (
                <TableStateRow columns={6} title="No meetings found" description="Try changing search or filters." />
              ) : (
                meetings.map((meeting) => (
                  <MeetingRow
                    key={meeting.id}
                    meeting={meeting}
                    isActionPending={activeActionMeetingId === meeting.id}
                    onForceEndMeeting={onForceEndMeeting}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {data ? (
          <AdminPagination
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            isFetching={isFetching}
            onPageChange={onPageChange}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function MeetingRow({
  meeting,
  isActionPending,
  onForceEndMeeting,
}: {
  meeting: AdminMeeting;
  isActionPending: boolean;
  onForceEndMeeting: (meeting: AdminMeeting) => void;
}) {
  const title = meeting.title?.trim() || "Untitled meeting";
  const hostName = meeting.hostName?.trim() || "Unknown host";
  const hostEmail = meeting.hostEmail?.trim();
  const meetingCode = meeting.meetingCode?.trim() || "—";
  const canForceEnd = meeting.status?.toString().trim().toUpperCase() === "ACTIVE";

  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-4 pr-4">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground">{formatTime(meeting.startTime)}</p>
      </td>
      <td className="px-4 py-4">
        <p className="text-foreground">{hostName}</p>
        {hostEmail ? <p className="text-muted-foreground">{hostEmail}</p> : null}
      </td>
      <td className="px-4 py-4">
        <AdminStatusBadge kind="meeting" status={meeting.status || "SCHEDULED"} />
      </td>
      <td className="px-4 py-4">
        <span className="inline-flex items-center gap-2">
          <UsersRound className="h-4 w-4 text-muted-foreground" />
          {(meeting.participantCount ?? 0).toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-4">
        <code className="rounded bg-muted px-2 py-1 text-xs">
          {meetingCode}
        </code>
      </td>
      <td className="py-4 pl-4 text-right">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={!canForceEnd || isActionPending}
          onClick={() => onForceEndMeeting(meeting)}
        >
          <Power className="h-4 w-4" />
          End now
        </Button>
      </td>
    </tr>
  );
}

function TableSkeletonRows({ columns }: { columns: number }) {
  return Array.from({ length: 5 }).map((_, rowIndex) => (
    <tr key={rowIndex} className="border-b border-border/60 last:border-0">
      {Array.from({ length: columns }).map((__, columnIndex) => (
        <td key={columnIndex} className="py-4 pr-4">
          <div className="h-4 w-full max-w-[160px] animate-pulse rounded bg-muted" />
        </td>
      ))}
    </tr>
  ));
}

function TableStateRow({
  columns,
  title,
  description,
  onRetry,
}: {
  columns: number;
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <tr>
      <td colSpan={columns} className="py-10 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
