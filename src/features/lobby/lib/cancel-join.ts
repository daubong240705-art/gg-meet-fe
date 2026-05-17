import {
  decodeMeetingToken,
  type MeetingSocketMessage,
} from "@/lib/meeting/meeting-websocket";

import type { LobbyJoinPayload } from "../types";
import { getGuestJoinRequest } from "./join-state";

export function getCancelJoinMessage(payload?: LobbyJoinPayload | null): MeetingSocketMessage | undefined {
  if (!payload) {
    return undefined;
  }

  const decodedMeetingToken = decodeMeetingToken(payload.meetingToken);
  const normalizedTargetName = payload.userName.trim();
  const normalizedMeetingToken = payload.meetingToken?.trim() || null;
  const normalizedGuestRequest = getGuestJoinRequest(payload);

  if (
    decodedMeetingToken.participantId === null
    && !normalizedTargetName
    && !normalizedMeetingToken
    && !normalizedGuestRequest
  ) {
    return undefined;
  }

  return {
    targetParticipantId: decodedMeetingToken.participantId,
    targetName: normalizedTargetName || null,
    meetingCode: decodedMeetingToken.meetingCode || null,
    action: "CANCEL_SUCCESS",
  };
}

export function getCancelJoinRequest(payload?: LobbyJoinPayload | null) {
  if (!payload) {
    return undefined;
  }

  const decodedMeetingToken = decodeMeetingToken(payload.meetingToken);
  const normalizedTargetName = payload.userName.trim();
  const normalizedMeetingToken = payload.meetingToken?.trim() || null;
  const normalizedGuestRequest = getGuestJoinRequest(payload);

  if (!normalizedMeetingToken && decodedMeetingToken.participantId === null) {
    return undefined;
  }

  return {
    targetParticipantId: decodedMeetingToken.participantId,
    targetName: normalizedTargetName || null,
    guestId: normalizedGuestRequest?.guestId ?? null,
    guestName: normalizedGuestRequest?.guestName ?? null,
    meetingToken: normalizedMeetingToken,
  };
}
