"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  persistInstantMeetingSession,
  type InstantMeetingSession,
} from "@/lib/meeting/instant-meeting-session";
import type { MeetingParticipantStatus } from "@/shared/services/meeting.service";

import {
  areLobbyJoinStatesEqual,
  getInitialPendingJoinState,
} from "../lib/join-state";
import type {
  LobbyJoinPayload,
  LobbyPendingJoinState,
} from "../types";

type UseLobbyJoinSessionParams = {
  initialMeetingSession: InstantMeetingSession | null;
  initialParticipantStatus: MeetingParticipantStatus | null;
};

export function useLobbyJoinSession({
  initialMeetingSession,
  initialParticipantStatus,
}: UseLobbyJoinSessionParams) {
  const pendingJoinStateRef = useRef<LobbyPendingJoinState | null>(null);
  const hasTriggeredUnloadCancelRef = useRef(false);
  const hasHandledMeetingEndedRef = useRef(false);
  const hasCompletedPendingJoinRef = useRef(false);
  const isMountedRef = useRef(true);
  const [pendingJoinState, setPendingJoinState] = useState<LobbyPendingJoinState | null>(() =>
    getInitialPendingJoinState(initialMeetingSession, initialParticipantStatus)
  );

  const persistLobbySession = useCallback((
    resolvedMeetingCode: string,
    payload: LobbyJoinPayload,
    participantStatus: MeetingParticipantStatus | null,
  ) => {
    persistInstantMeetingSession({
      meetingCode: resolvedMeetingCode,
      title: payload.title ?? null,
      userName: payload.userName,
      guestId: payload.guestId ?? null,
      isMicOn: payload.isMicOn,
      isCameraOn: payload.isCameraOn,
      selectedMic: payload.selectedMic ?? null,
      selectedCamera: payload.selectedCamera ?? null,
      livekitToken: payload.livekitToken ?? null,
      meetingToken: payload.meetingToken ?? null,
      participantStatus,
      hostId: payload.hostId ?? null,
      hostName: payload.hostName ?? null,
    });
  }, []);

  const updatePendingJoinState = useCallback((nextPendingJoinState: LobbyPendingJoinState | null) => {
    setPendingJoinState((currentState) => {
      if (areLobbyJoinStatesEqual(currentState, nextPendingJoinState)) {
        return currentState;
      }

      return nextPendingJoinState;
    });
  }, []);

  useEffect(() => {
    pendingJoinStateRef.current = pendingJoinState;
  }, [pendingJoinState]);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  return {
    pendingJoinState,
    setPendingJoinState,
    updatePendingJoinState,
    pendingJoinStateRef,
    hasTriggeredUnloadCancelRef,
    hasHandledMeetingEndedRef,
    hasCompletedPendingJoinRef,
    isMountedRef,
    persistLobbySession,
  };
}
