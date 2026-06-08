"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearPersistedChatMessages } from "@/lib/meeting/chat-session-storage";
import {
  clearInstantMeetingSession,
  readInstantMeetingSession,
} from "@/lib/meeting/instant-meeting-session";
import {
  normalizeMeetingParticipantStatus,
  shouldHandleMeetingParticipantInLobby,
} from "@/shared/services/meeting.service";
import type { LobbyJoinPayload } from "@/features/lobby/types";

export type MeetingJoinState = LobbyJoinPayload;
export type MeetingExitState = {
  leftAt: number;
  reason: "left" | "ended" | "kicked" | "banned";
};

type VerifyQuerySnapshot = {
  isPending: boolean;
  isSuccess: boolean;
};

export function useMeetingPageState(
  meetingCode: string,
  verifyQuery: VerifyQuerySnapshot,
) {
  const router = useRouter();

  const [joinState, setJoinState] = useState<MeetingJoinState | null>(() => {
    if (!meetingCode) return null;

    const pendingSession = readInstantMeetingSession(meetingCode);

    if (!pendingSession) return null;

    const participantStatus = normalizeMeetingParticipantStatus(
      pendingSession.participantStatus,
    );

    if (shouldHandleMeetingParticipantInLobby(participantStatus)) return null;

    return {
      title: pendingSession.title ?? null,
      userName: pendingSession.userName,
      guestId: pendingSession.guestId ?? null,
      isMicOn: pendingSession.isMicOn,
      isCameraOn: pendingSession.isCameraOn,
      selectedMic: pendingSession.selectedMic ?? null,
      selectedCamera: pendingSession.selectedCamera ?? null,
      livekitToken: pendingSession.livekitToken ?? null,
      meetingToken: pendingSession.meetingToken ?? null,
      participantStatus,
      hostId: pendingSession.hostId ?? null,
      hostName: pendingSession.hostName ?? null,
    };
  });

  const [leftMeetingState, setLeftMeetingState] =
    useState<MeetingExitState | null>(null);

  useEffect(() => {
    if (leftMeetingState || verifyQuery.isPending || verifyQuery.isSuccess) {
      return;
    }

    clearInstantMeetingSession(meetingCode);
  }, [leftMeetingState, meetingCode, verifyQuery.isPending, verifyQuery.isSuccess]);

  const handleGoHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  const handleMeetingEnded = useCallback(() => {
    clearInstantMeetingSession(meetingCode);
    clearPersistedChatMessages(meetingCode);
    setJoinState(null);
    setLeftMeetingState({ leftAt: Date.now(), reason: "ended" });
  }, [meetingCode]);

  const handleLobbyJoin = useCallback((payload: MeetingJoinState) => {
    setLeftMeetingState(null);
    setJoinState(payload);
  }, []);

  const handleLeaveMeeting = useCallback(
    (reason: "left" | "ended" | "kicked" | "banned" = "left") => {
      clearInstantMeetingSession(meetingCode);
      clearPersistedChatMessages(meetingCode);
      setJoinState(null);
      setLeftMeetingState({ leftAt: Date.now(), reason });
    },
    [meetingCode],
  );

  const handleRejoin = useCallback(() => {
    setLeftMeetingState(null);
  }, []);

  return {
    joinState,
    leftMeetingState,
    handleGoHome,
    handleMeetingEnded,
    handleLobbyJoin,
    handleLeaveMeeting,
    handleRejoin,
  };
}
