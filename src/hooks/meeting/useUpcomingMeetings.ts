"use client";

import { useQuery } from "@tanstack/react-query";

import {
    meetingApi,
    type UpcomingMeetingResponseData,
    type UpcomingMeetingsResponseData,
} from "@/service/meeting.service";

import { assertApiSuccess } from "../shared/mutation.utils";

export const UPCOMING_MEETINGS_QUERY_KEY = ["meetings", "upcoming"] as const;

export const upcomingMeetingsQueryKey = ({ page = 0, size = 3 }: { page?: number; size?: number } = {}) => [
    ...UPCOMING_MEETINGS_QUERY_KEY,
    { page, size },
] as const;

export function useUpcomingMeetings({ page = 0, size = 3 }: { page?: number; size?: number } = {}) {
    return useQuery<
        IBackendRes<UpcomingMeetingsResponseData>,
        IBackendRes<unknown>,
        UpcomingMeetingResponseData[]
    >({
        queryKey: upcomingMeetingsQueryKey({ page, size }),
        queryFn: async () => {
            const response = await meetingApi.getUpcomingMeetings({ page, size });
            return assertApiSuccess(response);
        },
        select: (response) => response.data?.content ?? [],
        staleTime: 30_000,
        refetchInterval: 60_000,
        refetchIntervalInBackground: false,
        placeholderData: (previousData) => previousData,
    });
}
