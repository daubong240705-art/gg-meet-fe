import { getBackendBaseUrl } from "@/lib/config/api-url";

import type { CancelJoinRequest } from "./types";

export const getCancelJoinProxyUrl = (meetingCode: string) =>
  `/api/proxy/meetings/${encodeURIComponent(meetingCode)}/cancel-join`;

export const getCancelJoinDirectUrl = (meetingCode: string) =>
  `${getBackendBaseUrl().replace(/\/+$/, "")}/meetings/${encodeURIComponent(meetingCode)}/cancel-join`;

// Desktop path: sendBeacon cannot carry an Authorization header, and the
// packaged app has no Next server to proxy through, so call the backend
// directly. keepalive lets the request outlive the closing window (the
// cancel-join payload is far below the 64 KB keepalive body limit).
export function sendCancelJoinDirect(
  meetingCode: string,
  body: string,
  accessToken: string | null,
): boolean {
  void fetch(getCancelJoinDirectUrl(meetingCode), {
    method: "POST",
    keepalive: true,
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
    },
    body,
  }).catch(() => undefined);

  return true;
}

export const normalizeCancelJoinRequest = (request?: CancelJoinRequest | null) => {
  if (!request) {
    return null;
  }

  const normalizedRequest: Record<string, number | string> = {};

  if (typeof request.targetParticipantId === "number" && Number.isFinite(request.targetParticipantId)) {
    normalizedRequest.targetParticipantId = request.targetParticipantId;
  }

  const normalizedTargetName = request.targetName?.trim();

  if (normalizedTargetName) {
    normalizedRequest.targetName = normalizedTargetName;
  }

  const normalizedGuestId = request.guestId?.trim();

  if (normalizedGuestId) {
    normalizedRequest.guestId = normalizedGuestId;
  }

  const normalizedGuestName = request.guestName?.trim();

  if (normalizedGuestName) {
    normalizedRequest.guestName = normalizedGuestName;
  }

  const normalizedMeetingToken = request.meetingToken?.trim();

  if (normalizedMeetingToken) {
    normalizedRequest.meetingToken = normalizedMeetingToken;
  }

  return Object.keys(normalizedRequest).length > 0 ? normalizedRequest : null;
};
