"use client";

import { useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import { clearInstantMeetingSession } from "@/lib/meeting/instant-meeting-session";
import { playGuestAdmittedSound } from "@/lib/meeting/lobby-audio";
import type { MeetingSocketConnection } from "@/lib/meeting/meeting-websocket";
import {
  getMeetingApiErrorDescription,
  isMeetingParticipantAwaitingApproval,
  isMeetingScheduledNotStartedError,
  meetingApi,
  normalizeMeetingParticipantStatus,
  type JoinMeetingResponseData,
  type JoinRequestStatusResponseData,
  type MeetingParticipantStatus,
} from "@/shared/services/meeting.service";

import { shouldTreatPendingJoinErrorAsMeetingEnded } from "../lib/errors";
import { getGuestJoinRequest } from "../lib/join-state";
import type { LobbyJoinPayload, LobbyPendingJoinState } from "../types";

type UseLobbyJoinFlowParams = {
  meetingCode: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  selectedMic: string;
  selectedCamera: string;
  waitingSocketRef: { current: MeetingSocketConnection | null };
  hasHandledMeetingEndedRef: { current: boolean };
  hasCompletedPendingJoinRef: { current: boolean };
  isMountedRef: { current: boolean };
  clearDisconnectCancelTimeout: () => void;
  disconnectMeetingSocket: (connection?: MeetingSocketConnection | null) => void;
  persistLobbySession: (
    resolvedMeetingCode: string,
    payload: LobbyJoinPayload,
    participantStatus: MeetingParticipantStatus | null,
  ) => void;
  updatePendingJoinState: (nextPendingJoinState: LobbyPendingJoinState | null) => void;
  setPendingJoinState: (nextPendingJoinState: LobbyPendingJoinState | null) => void;
  setIsWaitingSocketConnected: (value: boolean) => void;
  setWaitingSocketError: (value: string) => void;
  setWaitingSocketRetryKey: (updater: (currentValue: number) => number) => void;
  onJoin: (payload: LobbyJoinPayload) => void;
  onMeetingEnded: () => void;
};

export function useLobbyJoinFlow({
  meetingCode,
  isMicOn,
  isCameraOn,
  selectedMic,
  selectedCamera,
  waitingSocketRef,
  hasHandledMeetingEndedRef,
  hasCompletedPendingJoinRef,
  isMountedRef,
  clearDisconnectCancelTimeout,
  disconnectMeetingSocket,
  persistLobbySession,
  updatePendingJoinState,
  setPendingJoinState,
  setIsWaitingSocketConnected,
  setWaitingSocketError,
  setWaitingSocketRetryKey,
  onJoin,
  onMeetingEnded,
}: UseLobbyJoinFlowParams) {
  const buildResolvedJoinPayload = useCallback((
    responseData: JoinMeetingResponseData | JoinRequestStatusResponseData | null | undefined,
    baseState: LobbyPendingJoinState,
  ) => {
    const participantStatus = normalizeMeetingParticipantStatus(
      responseData?.participantStatus,
    );
    const livekitToken = responseData?.livekitToken?.trim() || null;
    const meetingToken = responseData?.meetingToken?.trim() || baseState.meetingToken || null;
    const guestSecret = responseData?.guestSecret?.trim() || baseState.guestSecret || null;
    const resolvedMeetingCode = responseData?.meetingCode?.trim() || meetingCode;

    return {
      participantStatus,
      resolvedMeetingCode,
      joinPayload: {
        ...baseState,
        title: responseData?.title?.trim() || baseState.title || null,
        isMicOn,
        isCameraOn,
        selectedMic,
        selectedCamera,
        livekitToken,
        meetingToken,
        guestSecret,
        participantStatus,
        hostId: responseData?.host?.id?.toString() ?? baseState.hostId ?? null,
        hostName: responseData?.host?.fullName?.trim() || baseState.hostName || null,
      } satisfies LobbyJoinPayload,
    };
  }, [isCameraOn, isMicOn, meetingCode, selectedCamera, selectedMic]);

  const handleMeetingEnded = useCallback(() => {
    if (hasHandledMeetingEndedRef.current) {
      return;
    }

    hasHandledMeetingEndedRef.current = true;
    clearDisconnectCancelTimeout();
    disconnectMeetingSocket(waitingSocketRef.current);
    waitingSocketRef.current = null;
    clearInstantMeetingSession(meetingCode);
    setPendingJoinState(null);
    setIsWaitingSocketConnected(false);
    setWaitingSocketError("");
    onMeetingEnded();
  }, [
    clearDisconnectCancelTimeout,
    disconnectMeetingSocket,
    hasHandledMeetingEndedRef,
    meetingCode,
    onMeetingEnded,
    setIsWaitingSocketConnected,
    setPendingJoinState,
    setWaitingSocketError,
    waitingSocketRef,
  ]);

  const completeApprovedJoin = useCallback((
    approvedJoinPayload: LobbyJoinPayload,
    description: string,
  ) => {
    if (hasCompletedPendingJoinRef.current) {
      return;
    }

    hasCompletedPendingJoinRef.current = true;
    playGuestAdmittedSound();
    toast.success("You were admitted", {
      description,
    });
    onJoin(approvedJoinPayload);
  }, [hasCompletedPendingJoinRef, onJoin]);

  const requestApprovedJoin = useCallback(async (nextPendingJoinState: LobbyPendingJoinState) => {
    const response = await meetingApi.joinMeeting(
      meetingCode,
      getGuestJoinRequest(nextPendingJoinState),
    );
    const verifiedResponse = assertApiSuccess(response);
    const {
      participantStatus,
      resolvedMeetingCode,
      joinPayload: approvedJoinPayload,
    } = buildResolvedJoinPayload(verifiedResponse.data, nextPendingJoinState);

    if (!approvedJoinPayload.livekitToken) {
      throw new Error("The host approved you, but the server did not provide a LiveKit token yet.");
    }

    persistLobbySession(resolvedMeetingCode, approvedJoinPayload, participantStatus);
    return approvedJoinPayload;
  }, [buildResolvedJoinPayload, meetingCode, persistLobbySession]);

  const syncPendingJoinStatus = useCallback(async (
    nextPendingJoinState: LobbyPendingJoinState,
    silent: boolean,
  ) => {
    if (!nextPendingJoinState.meetingToken) {
      return;
    }

    try {
      const response = await meetingApi.getJoinRequestStatus(
        meetingCode,
        nextPendingJoinState.meetingToken,
      );
      const verifiedResponse = assertApiSuccess(response);

      if (!isMountedRef.current) {
        return;
      }

      const {
        participantStatus,
        resolvedMeetingCode,
        joinPayload,
      } = buildResolvedJoinPayload(verifiedResponse.data, nextPendingJoinState);
      const normalizedParticipantStatus =
        participantStatus === "REJECT" ? "REJECTED" : participantStatus;
      const nextResolvedPendingJoinState: LobbyPendingJoinState = {
        ...joinPayload,
        participantStatus: normalizedParticipantStatus,
      };

      if (participantStatus === "ACCEPT") {
        if (!joinPayload.livekitToken) {
          throw new Error("The host approved you, but the server did not provide a LiveKit token yet.");
        }

        persistLobbySession(resolvedMeetingCode, joinPayload, participantStatus);
        completeApprovedJoin(joinPayload, "The host admitted you to the meeting.");
        return;
      }

      if (normalizedParticipantStatus === "REJECTED") {
        clearInstantMeetingSession(meetingCode);
        updatePendingJoinState(nextResolvedPendingJoinState);
        setIsWaitingSocketConnected(false);
        setWaitingSocketError("");

        if (!silent) {
          toast.error("Join request declined", {
            description: "The host declined this join request.",
          });
        }
        return;
      }

      persistLobbySession(
        resolvedMeetingCode,
        nextResolvedPendingJoinState,
        normalizedParticipantStatus ?? "WAITING",
      );
      updatePendingJoinState(nextResolvedPendingJoinState);
      setWaitingSocketError("");
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const apiError = error as IBackendRes<unknown>;
      if (shouldTreatPendingJoinErrorAsMeetingEnded(apiError)) {
        handleMeetingEnded();
        return;
      }

      const errorMessage =
        error instanceof Error
          ? error.message
          : getMeetingApiErrorDescription(apiError) || "Please try again in a moment.";

      setWaitingSocketError(errorMessage);

      if (!silent) {
        toast.error("Unable to refresh your join request", {
          description: errorMessage,
        });
      }
    }
  }, [
    buildResolvedJoinPayload,
    completeApprovedJoin,
    handleMeetingEnded,
    isMountedRef,
    meetingCode,
    persistLobbySession,
    setIsWaitingSocketConnected,
    setWaitingSocketError,
    updatePendingJoinState,
  ]);

  const joinMeetingMutation = useMutation<
    IBackendRes<JoinMeetingResponseData>,
    IBackendRes<unknown>,
    LobbyJoinPayload
  >({
    mutationFn: async (payload) => {
      const response = await meetingApi.joinMeeting(
        meetingCode,
        getGuestJoinRequest(payload),
      );
      return assertApiSuccess(response);
    },
    onSuccess: (response, payload) => {
      const {
        participantStatus,
        resolvedMeetingCode,
        joinPayload: nextJoinPayload,
      } = buildResolvedJoinPayload(response.data, payload);

      if (isMeetingParticipantAwaitingApproval(participantStatus)) {
        if (!nextJoinPayload.meetingToken) {
          toast.error("Unable to send join request", {
            description: "The server did not return a meeting token for the waiting room.",
          });
          return;
        }

        persistLobbySession(resolvedMeetingCode, nextJoinPayload, participantStatus);
        setIsWaitingSocketConnected(false);
        updatePendingJoinState(nextJoinPayload);
        setWaitingSocketError("");
        setWaitingSocketRetryKey((currentValue) => currentValue + 1);
        return;
      }

      if (!nextJoinPayload.livekitToken) {
        toast.error("Unable to join meeting", {
          description: "The server did not return a valid LiveKit token.",
        });
        return;
      }

      persistLobbySession(resolvedMeetingCode, nextJoinPayload, participantStatus);
      onJoin(nextJoinPayload);
    },
    onError: (error) => {
      const isMeetingNotStarted = isMeetingScheduledNotStartedError(error);

      toast.error(
        isMeetingNotStarted ? "This meeting hasn't started yet" : "Unable to join meeting",
        {
          description: isMeetingNotStarted
            ? "Try again after the host starts the scheduled meeting."
            : getMeetingApiErrorDescription(error) || "Please try again in a moment.",
        },
      );
    },
  });

  return {
    joinMeetingMutation,
    handleMeetingEnded,
    completeApprovedJoin,
    requestApprovedJoin,
    syncPendingJoinStatus,
  };
}
