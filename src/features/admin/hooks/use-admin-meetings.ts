"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import {
  adminApi,
  type AdminMeeting,
  type AdminMeetingsQuery,
  type AdminPaged,
} from "@/shared/services/admin.service";

export const adminMeetingsQueryKey = ({
  page = 0,
  size = 10,
  search = "",
  status = "",
  from = "",
  to = "",
}: AdminMeetingsQuery = {}) => ["admin", "meetings", page, size, search, status, from, to] as const;

type UseAdminMeetingsOptions = {
  enabled?: boolean;
};

export function useAdminMeetings(
  params: AdminMeetingsQuery = {},
  { enabled = true }: UseAdminMeetingsOptions = {},
) {
  return useQuery<AdminPaged<AdminMeeting>, IBackendRes<unknown> | Error>({
    queryKey: adminMeetingsQueryKey(params),
    queryFn: async () => {
      const response = assertApiSuccess(await adminApi.getMeetings(params));

      if (!response.data) {
        throw new Error("The server did not return meetings data.");
      }

      return response.data;
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}
