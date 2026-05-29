export type AdminMetricTrend = "up" | "down";

export type AdminMetric = {
  value?: number | null;
  changePercent?: number | null;
  change?: string | null;
  trend?: AdminMetricTrend | null;
};

export type AdminOverview = {
  totalUsers?: AdminMetric | null;
  activeMeetings?: AdminMetric | null;
  totalMeetingsToday?: AdminMetric | null;
};

export type AdminPaged<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export type AdminUserRole = "USER" | "ADMIN";
export type AdminUserStatus = "ACTIVE" | "INACTIVE";

export type AdminUser = {
  id: number;
  email?: string | null;
  fullName?: string | null;
  role?: AdminUserRole | string | null;
  status?: AdminUserStatus | string | null;
  avatar?: string | null;
  meetingCount?: number | null;
  createdAt?: string | null;
};

export type AdminMeetingStatus = "SCHEDULED" | "ACTIVE" | "ENDED";

export type AdminMeeting = {
  id: number;
  meetingCode?: string | null;
  title?: string | null;
  status?: AdminMeetingStatus | string | null;
  isScheduled?: boolean | null;
  hostId?: number | null;
  hostName?: string | null;
  hostEmail?: string | null;
  participantCount?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  createdAt?: string | null;
};

export type AdminUsersQuery = {
  page?: number;
  size?: number;
  search?: string;
  role?: AdminUserRole | "";
  status?: AdminUserStatus | "";
};

export type AdminMeetingsQuery = {
  page?: number;
  size?: number;
  search?: string;
  status?: AdminMeetingStatus | "";
  from?: string;
  to?: string;
};
