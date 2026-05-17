"use client";

import { useQuery } from "@tanstack/react-query";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import { meetingApi, type VerifyMeetingResponseData } from "@/shared/services/meeting.service";

export function useVerifyMeeting(meetingCode: string) {
  return useQuery<IBackendRes<VerifyMeetingResponseData | null>, IBackendRes<unknown>>({
    queryKey: ["meeting", "verify", meetingCode],
    queryFn: async () => {
      const response = await meetingApi.verifyMeeting(meetingCode);
      return assertApiSuccess(response);
    },
    enabled: Boolean(meetingCode),
    retry: false,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
