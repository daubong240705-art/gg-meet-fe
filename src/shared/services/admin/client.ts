import { sendRequest } from "@/lib/api/wrapper";
import { getBackendBaseUrl } from "@/lib/config/api-url";

import type {
  AdminMeeting,
  AdminMeetingsQuery,
  AdminOverview,
  AdminPaged,
  AdminUsersQuery,
  AdminUser,
} from "./types";

const API_URL = getBackendBaseUrl();

const compactQueryParams = <T extends Record<string, unknown>>(params: T) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );

export const adminApi = {
  getOverview() {
    return sendRequest<IBackendRes<AdminOverview>>({
      url: `${API_URL}/admin/dashboard/overview`,
      method: "GET",
      useCredentials: true,
      auth: true,
    });
  },

  getUsers({ page = 0, size = 10, search, role, status }: AdminUsersQuery = {}) {
    return sendRequest<IBackendRes<AdminPaged<AdminUser>>>({
      url: `${API_URL}/admin/users`,
      method: "GET",
      queryParams: compactQueryParams({
        page,
        size,
        search: search?.trim(),
        role,
        status,
      }),
      useCredentials: true,
      auth: true,
    });
  },

  getMeetings({ page = 0, size = 10, search, status, from, to }: AdminMeetingsQuery = {}) {
    return sendRequest<IBackendRes<AdminPaged<AdminMeeting>>>({
      url: `${API_URL}/admin/meetings`,
      method: "GET",
      queryParams: compactQueryParams({
        page,
        size,
        search: search?.trim(),
        status,
        from,
        to,
      }),
      useCredentials: true,
      auth: true,
    });
  },
};
