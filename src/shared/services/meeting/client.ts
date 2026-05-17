import { sendRequest } from "@/lib/api/wrapper";
import { readStoredAccessToken } from "@/lib/auth/auth-token";
import { getBackendBaseUrl } from "@/lib/config/api-url";

import {
  getCancelJoinProxyUrl,
  normalizeCancelJoinRequest,
} from "./cancel-join";
import type {
  CancelJoinRequest,
  CreateMeetingResponseData,
  EndMeetingResponseData,
  GuestJoinRequest,
  JoinMeetingResponseData,
  JoinRequestStatusResponseData,
  LeaveMeetingResponseData,
  MeetingRequestOptions,
  ScheduleMeetingRequest,
  ScheduleMeetingResponseData,
  UpcomingMeetingsResponseData,
  VerifyMeetingResponseData,
  WaitingRoomRequestData,
} from "./types";

const API_URL = getBackendBaseUrl();

export const DEFAULT_INSTANT_MEETING_TITLE = "Quick Team Sync";

const getMeetingTokenHeaders = (meetingToken?: string | null) => {
  const normalizedMeetingToken = meetingToken?.trim();

  if (!normalizedMeetingToken) {
    return undefined;
  }

  return {
    "Meeting-Token": normalizedMeetingToken,
  };
};

export const meetingApi = {
  createInstantMeeting(title: string = DEFAULT_INSTANT_MEETING_TITLE) {
    return sendRequest<IBackendRes<CreateMeetingResponseData>>({
      url: `${API_URL}/meetings`,
      method: "POST",
      queryParams: {
        title,
      },
      useCredentials: true,
      auth: true,
    });
  },

  scheduleMeeting(meetingData: ScheduleMeetingRequest) {
    return sendRequest<IBackendRes<ScheduleMeetingResponseData>>({
      url: `${API_URL}/meetings/schedule`,
      method: "POST",
      body: meetingData,
      useCredentials: true,
      auth: true,
    });
  },

  getUpcomingMeetings({ page = 0, size = 3 }: { page?: number; size?: number } = {}) {
    return sendRequest<IBackendRes<UpcomingMeetingsResponseData>>({
      url: `${API_URL}/meetings/upcoming`,
      method: "GET",
      queryParams: {
        page,
        size,
      },
      useCredentials: true,
      auth: true,
    });
  },

  joinMeeting(meetingCode: string, guestRequest?: GuestJoinRequest | null) {
    const accessToken =
      typeof window !== "undefined" ? readStoredAccessToken() : null;

    return sendRequest<IBackendRes<JoinMeetingResponseData>>({
      url: `${API_URL}/meetings/${encodeURIComponent(meetingCode)}/join`,
      method: "POST",
      body: accessToken
        ? undefined
        : guestRequest && guestRequest.guestId.trim() && guestRequest.guestName.trim()
          ? {
            guestId: guestRequest.guestId.trim(),
            guestName: guestRequest.guestName.trim(),
          }
          : undefined,
      useCredentials: true,
      auth: Boolean(accessToken),
      accessToken,
      redirectOnAuthFail: false,
    });
  },

  verifyMeeting(meetingCode: string) {
    return sendRequest<IBackendRes<VerifyMeetingResponseData | null>>({
      url: `${API_URL}/meetings/verify`,
      method: "POST",
      queryParams: {
        meetingCode,
      },
      redirectOnAuthFail: false,
    });
  },

  getWaitingRoomRequests(meetingCode: string, meetingToken?: string | null) {
    return sendRequest<IBackendRes<WaitingRoomRequestData[]>>({
      url: `${API_URL}/meetings/${encodeURIComponent(meetingCode)}/waiting-room`,
      method: "GET",
      headers: getMeetingTokenHeaders(meetingToken),
      useCredentials: true,
      redirectOnAuthFail: false,
    });
  },

  getJoinRequestStatus(meetingCode: string, meetingToken?: string | null) {
    return sendRequest<IBackendRes<JoinRequestStatusResponseData>>({
      url: `${API_URL}/meetings/${encodeURIComponent(meetingCode)}/join-status`,
      method: "GET",
      headers: getMeetingTokenHeaders(meetingToken),
      useCredentials: true,
      redirectOnAuthFail: false,
    });
  },

  endMeeting(meetingCode: string) {
    const accessToken =
      typeof window !== "undefined" ? readStoredAccessToken() : null;

    return sendRequest<IBackendRes<EndMeetingResponseData>>({
      url: `${API_URL}/meetings`,
      method: "DELETE",
      queryParams: {
        meetingCode,
      },
      useCredentials: true,
      auth: Boolean(accessToken),
      accessToken,
      redirectOnAuthFail: false,
    });
  },

  leaveMeeting(
    meetingCode: string,
    participantId: number,
    meetingToken?: string | null,
    options?: MeetingRequestOptions,
  ) {
    const accessToken =
      typeof window !== "undefined" ? readStoredAccessToken() : null;

    return sendRequest<IBackendRes<LeaveMeetingResponseData>>({
      url: `${API_URL}/meetings/leave`,
      method: "DELETE",
      queryParams: {
        meetingCode,
        participantId,
      },
      headers: getMeetingTokenHeaders(meetingToken),
      useCredentials: true,
      auth: Boolean(accessToken),
      accessToken,
      redirectOnAuthFail: false,
      nextOption: options?.keepalive ? { keepalive: true } : undefined,
    });
  },

  cancelJoin(
    meetingCode: string,
    cancelJoinRequest?: CancelJoinRequest | null,
    options?: MeetingRequestOptions,
  ) {
    const accessToken =
      typeof window !== "undefined" ? readStoredAccessToken() : null;
    const normalizedCancelJoinRequest = normalizeCancelJoinRequest(cancelJoinRequest);

    return sendRequest<IBackendRes<null>>({
      url: getCancelJoinProxyUrl(meetingCode),
      method: "POST",
      body: normalizedCancelJoinRequest ?? undefined,
      useCredentials: true,
      auth: Boolean(accessToken),
      accessToken,
      redirectOnAuthFail: false,
      nextOption: options?.keepalive ? { keepalive: true } : undefined,
    });
  },

  cancelJoinWithBeacon(meetingCode: string, cancelJoinRequest?: CancelJoinRequest | null) {
    if (
      typeof navigator === "undefined"
      || typeof navigator.sendBeacon !== "function"
    ) {
      return false;
    }

    const normalizedCancelJoinRequest = normalizeCancelJoinRequest(cancelJoinRequest);

    const requestBody = normalizedCancelJoinRequest
      ? JSON.stringify(normalizedCancelJoinRequest)
      : "";

    return navigator.sendBeacon(
      getCancelJoinProxyUrl(meetingCode),
      new Blob([requestBody], { type: "application/json" }),
    );
  },
};
