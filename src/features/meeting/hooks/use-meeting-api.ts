"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import {
  DEFAULT_INSTANT_MEETING_TITLE,
  meetingApi,
  type CancelJoinRequest,
  type CreateMeetingResponseData,
  type EndMeetingResponseData,
  type GuestJoinRequest,
  type JoinMeetingResponseData,
  type JoinRequestStatusResponseData,
  type LeaveMeetingResponseData,
  type ScheduleMeetingRequest,
  type ScheduleMeetingResponseData,
  type UpcomingMeetingsResponseData,
  type VerifyMeetingResponseData,
  type WaitingRoomRequestData,
} from "@/shared/services/meeting.service";

export const meetingQueryKeys = {
  all: ["meeting"] as const,
  verify: (meetingCode: string) => [...meetingQueryKeys.all, "verify", meetingCode] as const,
  upcoming: (page = 0, size = 3) => [...meetingQueryKeys.all, "upcoming", page, size] as const,
  waitingRoom: (meetingCode: string) => [...meetingQueryKeys.all, "waiting-room", meetingCode] as const,
  joinStatus: (meetingCode: string) => [...meetingQueryKeys.all, "join-status", meetingCode] as const,
};

export function useCreateInstantMeetingMutation() {
  return useMutation<IBackendRes<CreateMeetingResponseData>, IBackendRes<unknown>, string | undefined>({
    mutationFn: async (title = DEFAULT_INSTANT_MEETING_TITLE) => {
      const response = await meetingApi.createInstantMeeting(title);
      return assertApiSuccess(response);
    },
  });
}

export function useScheduleMeetingMutation() {
  const queryClient = useQueryClient();

  return useMutation<IBackendRes<ScheduleMeetingResponseData>, IBackendRes<unknown>, ScheduleMeetingRequest>({
    mutationFn: async (payload) => {
      const response = await meetingApi.scheduleMeeting(payload);
      return assertApiSuccess(response);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: meetingQueryKeys.all });
    },
  });
}

export function useUpcomingMeetingsQuery({ page = 0, size = 3 }: { page?: number; size?: number } = {}) {
  return useQuery<IBackendRes<UpcomingMeetingsResponseData>, IBackendRes<unknown> | Error>({
    queryKey: meetingQueryKeys.upcoming(page, size),
    queryFn: async () => {
      const response = await meetingApi.getUpcomingMeetings({ page, size });
      return assertApiSuccess(response);
    },
  });
}

export function useVerifyMeetingQuery(meetingCode: string, enabled = true) {
  return useQuery<IBackendRes<VerifyMeetingResponseData | null>, IBackendRes<unknown> | Error>({
    queryKey: meetingQueryKeys.verify(meetingCode),
    enabled: enabled && Boolean(meetingCode.trim()),
    queryFn: async () => {
      const response = await meetingApi.verifyMeeting(meetingCode);
      return assertApiSuccess(response);
    },
  });
}

export function useVerifyMeetingMutation() {
  return useMutation<IBackendRes<VerifyMeetingResponseData | null>, IBackendRes<unknown>, string>({
    mutationFn: async (meetingCode) => {
      const response = await meetingApi.verifyMeeting(meetingCode);
      return assertApiSuccess(response);
    },
  });
}

export function useJoinMeetingMutation() {
  return useMutation<
    IBackendRes<JoinMeetingResponseData>,
    IBackendRes<unknown>,
    { meetingCode: string; guestRequest?: GuestJoinRequest | null }
  >({
    mutationFn: async ({ meetingCode, guestRequest }) => {
      const response = await meetingApi.joinMeeting(meetingCode, guestRequest);
      return assertApiSuccess(response);
    },
  });
}

export function useJoinRequestStatusQuery(
  meetingCode: string,
  meetingToken?: string | null,
  enabled = true,
) {
  return useQuery<IBackendRes<JoinRequestStatusResponseData>, IBackendRes<unknown> | Error>({
    queryKey: meetingQueryKeys.joinStatus(meetingCode),
    enabled: enabled && Boolean(meetingCode.trim() && meetingToken?.trim()),
    queryFn: async () => {
      const response = await meetingApi.getJoinRequestStatus(meetingCode, meetingToken);
      return assertApiSuccess(response);
    },
  });
}

export function useWaitingRoomRequestsQuery(
  meetingCode: string,
  meetingToken?: string | null,
  enabled = true,
) {
  return useQuery<IBackendRes<WaitingRoomRequestData[]>, IBackendRes<unknown> | Error>({
    queryKey: meetingQueryKeys.waitingRoom(meetingCode),
    enabled: enabled && Boolean(meetingCode.trim() && meetingToken?.trim()),
    queryFn: async () => {
      const response = await meetingApi.getWaitingRoomRequests(meetingCode, meetingToken);
      return assertApiSuccess(response);
    },
  });
}

export function useEndMeetingMutation() {
  return useMutation<IBackendRes<EndMeetingResponseData>, IBackendRes<unknown>, string>({
    mutationFn: async (meetingCode) => {
      const response = await meetingApi.endMeeting(meetingCode);
      return assertApiSuccess(response);
    },
  });
}

export function useLeaveMeetingMutation() {
  return useMutation<
    IBackendRes<LeaveMeetingResponseData>,
    IBackendRes<unknown>,
    { meetingCode: string; participantId: number; meetingToken?: string | null; keepalive?: boolean }
  >({
    mutationFn: async ({ meetingCode, participantId, meetingToken, keepalive }) => {
      const response = await meetingApi.leaveMeeting(meetingCode, participantId, meetingToken, { keepalive });
      return assertApiSuccess(response);
    },
  });
}

export function useCancelJoinMutation() {
  return useMutation<
    IBackendRes<null>,
    IBackendRes<unknown>,
    { meetingCode: string; cancelJoinRequest?: CancelJoinRequest | null; keepalive?: boolean }
  >({
    mutationFn: async ({ meetingCode, cancelJoinRequest, keepalive }) => {
      const response = await meetingApi.cancelJoin(meetingCode, cancelJoinRequest, { keepalive });
      return assertApiSuccess(response);
    },
  });
}
