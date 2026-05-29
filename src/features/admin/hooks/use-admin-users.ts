"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import {
  adminApi,
  type AdminPaged,
  type AdminUser,
  type AdminUsersQuery,
} from "@/shared/services/admin.service";

export const adminUsersQueryKey = ({
  page = 0,
  size = 10,
  search = "",
  role = "",
  status = "",
}: AdminUsersQuery = {}) => ["admin", "users", page, size, search, role, status] as const;

type UseAdminUsersOptions = {
  enabled?: boolean;
};

export function useAdminUsers(
  params: AdminUsersQuery = {},
  { enabled = true }: UseAdminUsersOptions = {},
) {
  return useQuery<AdminPaged<AdminUser>, IBackendRes<unknown> | Error>({
    queryKey: adminUsersQueryKey(params),
    queryFn: async () => {
      const response = assertApiSuccess(await adminApi.getUsers(params));

      if (!response.data) {
        throw new Error("The server did not return users data.");
      }

      return response.data;
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}
