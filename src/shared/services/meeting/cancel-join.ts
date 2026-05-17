import type { CancelJoinRequest } from "./types";

export const getCancelJoinProxyUrl = (meetingCode: string) =>
  `/api/proxy/meetings/${encodeURIComponent(meetingCode)}/cancel-join`;

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
