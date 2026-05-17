"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { clearInstantMeetingSession } from "@/lib/meeting/instant-meeting-session";
import type {
  ConnectMeetingSocketParams,
  MeetingSocketConnection,
  MeetingSocketMessage,
} from "@/lib/meeting/meeting-websocket";
import {
  isMeetingParticipantAwaitingApproval,
  meetingApi,
  type MeetingParticipantStatus,
} from "@/shared/services/meeting.service";

import {
  getCancelJoinMessage,
  getCancelJoinRequest,
} from "../lib/cancel-join";
import { getWaitingMessage } from "../lib/waiting-message";
import type { LobbyJoinPayload, LobbyPendingJoinState } from "../types";

type UseLobbyWaitingSocketStateParams = {
  isWaitingForApproval: boolean;
  pendingJoinState: LobbyPendingJoinState | null;
  hasCompletedPendingJoinRef: { current: boolean };
  hasTriggeredUnloadCancelRef: { current: boolean };
};

type UseLobbyWaitingSocketParams = {
  meetingCode: string;
  pendingJoinState: LobbyPendingJoinState | null;
  pendingParticipantStatus: MeetingParticipantStatus | null;
  isWaitingForApproval: boolean;
  isMicOn: boolean;
  isCameraOn: boolean;
  selectedMic: string;
  selectedCamera: string;
  waitingSocketRetryKey: number;
  waitingSocketRef: { current: MeetingSocketConnection | null };
  disconnectCancelTimeoutRef: { current: number | null };
  pendingJoinStateRef: { current: LobbyPendingJoinState | null };
  hasTriggeredUnloadCancelRef: { current: boolean };
  isMountedRef: { current: boolean };
  isWaitingSocketConnected: boolean;
  setIsWaitingSocketConnected: (value: boolean) => void;
  setWaitingSocketError: (value: string) => void;
  connectMeetingSocket: (params: ConnectMeetingSocketParams) => MeetingSocketConnection;
  disconnectMeetingSocket: (connection?: MeetingSocketConnection | null) => void;
  isSocketConnected: () => boolean;
  sendCancel: (message: MeetingSocketMessage) => void;
  clearDisconnectCancelTimeout: () => void;
  syncPendingJoinStatus: (nextPendingJoinState: LobbyPendingJoinState, silent: boolean) => Promise<void>;
  requestApprovedJoin: (nextPendingJoinState: LobbyPendingJoinState) => Promise<LobbyJoinPayload>;
  completeApprovedJoin: (approvedJoinPayload: LobbyJoinPayload, description: string) => void;
  handleMeetingEnded: () => void;
  updatePendingJoinState: (nextPendingJoinState: LobbyPendingJoinState | null) => void;
  persistLobbySession: (
    resolvedMeetingCode: string,
    payload: LobbyJoinPayload,
    participantStatus: MeetingParticipantStatus | null,
  ) => void;
};

export function useLobbyWaitingSocketState({
  isWaitingForApproval,
  pendingJoinState,
  hasCompletedPendingJoinRef,
  hasTriggeredUnloadCancelRef,
}: UseLobbyWaitingSocketStateParams) {
  const waitingSocketRef = useRef<MeetingSocketConnection | null>(null);
  const disconnectCancelTimeoutRef = useRef<number | null>(null);
  const [waitingSocketError, setWaitingSocketError] = useState("");
  const [isWaitingSocketConnected, setIsWaitingSocketConnected] = useState(false);
  const [waitingSocketRetryKey, setWaitingSocketRetryKey] = useState(0);

  const clearDisconnectCancelTimeout = useCallback(() => {
    if (disconnectCancelTimeoutRef.current !== null) {
      window.clearTimeout(disconnectCancelTimeoutRef.current);
      disconnectCancelTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isWaitingForApproval && pendingJoinState) {
      hasTriggeredUnloadCancelRef.current = false;
      hasCompletedPendingJoinRef.current = false;
      return;
    }

    clearDisconnectCancelTimeout();
  }, [
    clearDisconnectCancelTimeout,
    hasCompletedPendingJoinRef,
    hasTriggeredUnloadCancelRef,
    isWaitingForApproval,
    pendingJoinState,
  ]);

  return {
    waitingSocketRef,
    disconnectCancelTimeoutRef,
    waitingSocketError,
    setWaitingSocketError,
    isWaitingSocketConnected,
    setIsWaitingSocketConnected,
    waitingSocketRetryKey,
    setWaitingSocketRetryKey,
    clearDisconnectCancelTimeout,
  };
}

export function useLobbyWaitingSocket({
  meetingCode,
  pendingJoinState,
  pendingParticipantStatus,
  isWaitingForApproval,
  isMicOn,
  isCameraOn,
  selectedMic,
  selectedCamera,
  waitingSocketRetryKey,
  waitingSocketRef,
  disconnectCancelTimeoutRef,
  pendingJoinStateRef,
  hasTriggeredUnloadCancelRef,
  isMountedRef,
  isWaitingSocketConnected,
  setIsWaitingSocketConnected,
  setWaitingSocketError,
  connectMeetingSocket,
  disconnectMeetingSocket,
  isSocketConnected,
  sendCancel,
  clearDisconnectCancelTimeout,
  syncPendingJoinStatus,
  requestApprovedJoin,
  completeApprovedJoin,
  handleMeetingEnded,
  updatePendingJoinState,
  persistLobbySession,
}: UseLobbyWaitingSocketParams) {
  useEffect(() => {
    return () => {
      clearDisconnectCancelTimeout();
    };
  }, [clearDisconnectCancelTimeout]);

  useEffect(() => {
    if (!pendingJoinState || !isWaitingForApproval || !pendingJoinState.meetingToken) {
      return;
    }

    void syncPendingJoinStatus(pendingJoinState, true);
  }, [isWaitingForApproval, pendingJoinState, syncPendingJoinStatus]);

  useEffect(() => {
    if (
      !pendingJoinState
      || !isWaitingForApproval
      || !pendingJoinState.meetingToken
      || isWaitingSocketConnected
    ) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const activePendingJoinState = pendingJoinStateRef.current;

      if (
        !activePendingJoinState
        || !activePendingJoinState.meetingToken
        || !isMeetingParticipantAwaitingApproval(activePendingJoinState.participantStatus)
      ) {
        return;
      }

      void syncPendingJoinStatus(activePendingJoinState, true);
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    isWaitingForApproval,
    isWaitingSocketConnected,
    pendingJoinState,
    pendingJoinStateRef,
    syncPendingJoinStatus,
  ]);

  useEffect(() => {
    if (!pendingJoinState || !isWaitingForApproval) {
      return;
    }

    const handlePageExit = () => {
      if (hasTriggeredUnloadCancelRef.current) {
        return;
      }

      const activePendingJoinState = pendingJoinStateRef.current;

      if (
        !activePendingJoinState
        || !isMeetingParticipantAwaitingApproval(activePendingJoinState.participantStatus)
      ) {
        return;
      }

      hasTriggeredUnloadCancelRef.current = true;
      clearInstantMeetingSession(meetingCode);
      const cancelMessage = getCancelJoinMessage(activePendingJoinState);
      const cancelJoinRequest = getCancelJoinRequest(activePendingJoinState);

      try {
        if (cancelMessage && isSocketConnected()) {
          sendCancel({
            ...cancelMessage,
            meetingCode,
          });
        }
      } catch {
        // Browser may be tearing down the page; best-effort only.
      }

      if (cancelJoinRequest) {
        meetingApi.cancelJoinWithBeacon(meetingCode, cancelJoinRequest);
      }

      disconnectMeetingSocket(waitingSocketRef.current);
      waitingSocketRef.current = null;
    };

    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);

    return () => {
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
    };
  }, [
    disconnectMeetingSocket,
    hasTriggeredUnloadCancelRef,
    isSocketConnected,
    isWaitingForApproval,
    meetingCode,
    pendingJoinState,
    pendingJoinStateRef,
    sendCancel,
    waitingSocketRef,
  ]);

  useEffect(() => {
    if (!pendingJoinState || !isWaitingForApproval) {
      disconnectMeetingSocket(waitingSocketRef.current);
      waitingSocketRef.current = null;
      return;
    }

    if (!pendingJoinState.meetingToken) {
      return;
    }

    disconnectMeetingSocket(waitingSocketRef.current);
    waitingSocketRef.current = null;

    const connection = connectMeetingSocket({
      meetingCode,
      meetingToken: pendingJoinState.meetingToken,
      subscribeToMeetingTopic: true,
      subscribeToParticipantTopic: true,
      onConnect: () => {
        clearDisconnectCancelTimeout();
        setIsWaitingSocketConnected(true);
        setWaitingSocketError("");
        void syncPendingJoinStatus(pendingJoinState, true);
      },
      onDisconnect: () => {
        setIsWaitingSocketConnected(false);
        clearDisconnectCancelTimeout();
        disconnectCancelTimeoutRef.current = window.setTimeout(() => {
          if (!isMountedRef.current) {
            return;
          }

          setWaitingSocketError(
            "The waiting-room connection was lost. If the server handles disconnect cleanup, your request should be removed automatically.",
          );
        }, 8000);
      },
      onMeetingMessage: (message) => {
        const action = message.action?.trim().toUpperCase();

        if (action === "MEETING_ENDED") {
          handleMeetingEnded();
        }
      },
      onParticipantMessage: (message) => {
        const action = message.action?.trim().toUpperCase();

        if (action === "MEETING_ENDED") {
          handleMeetingEnded();
          return;
        }

        if (action === "ADMITTED") {
          void requestApprovedJoin(pendingJoinState).then((approvedJoinPayload) => {
            completeApprovedJoin(approvedJoinPayload, getWaitingMessage(message));
          }).catch((error) => {
            const errorMessage =
              error instanceof Error ? error.message : "Unable to finish joining the meeting.";

            setWaitingSocketError(errorMessage);
          });
          return;
        }

        if (action === "REJECTED") {
          clearInstantMeetingSession(meetingCode);
          const activePendingJoinState = pendingJoinStateRef.current ?? pendingJoinState;
          updatePendingJoinState(activePendingJoinState
            ? {
              ...activePendingJoinState,
              participantStatus: "REJECTED",
            }
            : pendingJoinState);
          setIsWaitingSocketConnected(false);
          toast.error("Join request declined", {
            description: getWaitingMessage(message),
          });
        }
      },
      onError: (error) => {
        setIsWaitingSocketConnected(false);
        setWaitingSocketError(error.message);
      },
    });

    waitingSocketRef.current = connection;

    return () => {
      disconnectMeetingSocket(connection);
      clearDisconnectCancelTimeout();

      if (waitingSocketRef.current === connection) {
        waitingSocketRef.current = null;
      }
    };
  }, [
    clearDisconnectCancelTimeout,
    completeApprovedJoin,
    connectMeetingSocket,
    disconnectCancelTimeoutRef,
    disconnectMeetingSocket,
    handleMeetingEnded,
    isMountedRef,
    isWaitingForApproval,
    meetingCode,
    pendingJoinState,
    pendingJoinStateRef,
    requestApprovedJoin,
    setIsWaitingSocketConnected,
    setWaitingSocketError,
    syncPendingJoinStatus,
    updatePendingJoinState,
    waitingSocketRef,
    waitingSocketRetryKey,
  ]);

  useEffect(() => {
    if (!pendingJoinState || !isWaitingForApproval) {
      return;
    }

    persistLobbySession(
      meetingCode,
      {
        ...pendingJoinState,
        userName: pendingJoinState.userName,
        isMicOn,
        isCameraOn,
        selectedMic,
        selectedCamera,
      },
      pendingParticipantStatus ?? "WAITING",
    );
  }, [
    isCameraOn,
    isMicOn,
    isWaitingForApproval,
    meetingCode,
    pendingJoinState,
    pendingParticipantStatus,
    persistLobbySession,
    selectedCamera,
    selectedMic,
  ]);
}
