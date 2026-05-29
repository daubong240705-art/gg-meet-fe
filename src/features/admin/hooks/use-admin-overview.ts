"use client";

import { useQuery } from "@tanstack/react-query";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import { adminApi, type AdminOverview } from "@/shared/services/admin.service";

export const ADMIN_OVERVIEW_QUERY_KEY = ["admin", "overview"] as const;

type UseAdminOverviewOptions = {
  enabled?: boolean;
};

export function useAdminOverview({ enabled = true }: UseAdminOverviewOptions = {}) {
  return useQuery<AdminOverview, IBackendRes<unknown> | Error>({
    queryKey: ADMIN_OVERVIEW_QUERY_KEY,
    queryFn: async () => {
      const response = assertApiSuccess(await adminApi.getOverview());

      if (!response.data) {
        throw new Error("The server did not return dashboard overview data.");
      }

      return response.data;
    },
    enabled,
    staleTime: 60_000,
  });
}
