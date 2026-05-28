import {
  normalizeMeetingParticipantStatus,
  shouldHandleMeetingParticipantInLobby,
  type MeetingParticipantStatus,
} from "@/shared/services/meeting.service";
import type { InstantMeetingSession } from "@/lib/meeting/instant-meeting-session";

import type {
  LobbyJoinPayload,
  LobbyPendingJoinState,
} from "../types";

export function createGuestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function getGuestJoinRequest(payload?: LobbyJoinPayload | null) {
  if (!payload?.guestId?.trim() || !payload.userName.trim()) {
    return undefined;
  }

  return {
    guestId: payload.guestId.trim(),
    guestSecret: payload.guestSecret?.trim() || null,
    guestName: payload.userName.trim(),
  };
}

export function areLobbyJoinStatesEqual(
  currentState?: LobbyPendingJoinState | null,
  nextState?: LobbyPendingJoinState | null,
) {
  if (!currentState || !nextState) {
    return currentState === nextState;
  }

  return currentState.title === nextState.title
    && currentState.userName === nextState.userName
    && currentState.guestId === nextState.guestId
    && currentState.guestSecret === nextState.guestSecret
    && currentState.isMicOn === nextState.isMicOn
    && currentState.isCameraOn === nextState.isCameraOn
    && currentState.livekitToken === nextState.livekitToken
    && currentState.meetingToken === nextState.meetingToken
    && currentState.participantStatus === nextState.participantStatus
    && currentState.hostId === nextState.hostId
    && currentState.hostName === nextState.hostName;
}

export function getInitialPendingJoinState(
  initialMeetingSession: InstantMeetingSession | null,
  initialParticipantStatus: MeetingParticipantStatus | null,
): LobbyPendingJoinState | null {
  if (!initialMeetingSession || !shouldHandleMeetingParticipantInLobby(initialParticipantStatus)) {
    return null;
  }

  return {
    title: initialMeetingSession.title ?? null,
    userName: initialMeetingSession.userName,
    guestId: initialMeetingSession.guestId ?? null,
    guestSecret: initialMeetingSession.guestSecret ?? null,
    isMicOn: initialMeetingSession.isMicOn,
    isCameraOn: initialMeetingSession.isCameraOn,
    selectedMic: initialMeetingSession.selectedMic ?? null,
    selectedCamera: initialMeetingSession.selectedCamera ?? null,
    livekitToken: initialMeetingSession.livekitToken ?? null,
    meetingToken: initialMeetingSession.meetingToken ?? null,
    participantStatus: normalizeMeetingParticipantStatus(initialMeetingSession.participantStatus),
    hostId: initialMeetingSession.hostId ?? null,
    hostName: initialMeetingSession.hostName ?? null,
  };
}
