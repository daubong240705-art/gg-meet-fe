"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  Video,
  VideoOff,
  WifiOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthSession } from "@/lib/auth/auth-session";
import { readStoredAccessToken } from "@/lib/auth/auth-token";
import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import {
  clearInstantMeetingSession,
  persistInstantMeetingSession,
  readInstantMeetingSession,
} from "@/lib/meeting/instant-meeting-session";
import { ensureMeetingAudioReady, playGuestAdmittedSound } from "@/lib/meeting/lobby-audio";
import { getAvatarInitials } from "@/lib/user/avatar";
import {
  connectMeetingSocket,
  decodeMeetingToken,
  type MeetingSocketMessage,
} from "@/lib/meeting/meeting-websocket";
import {
  getMeetingApiErrorDescription,
  isMeetingParticipantAwaitingApproval,
  meetingApi,
  normalizeMeetingParticipantStatus,
  shouldHandleMeetingParticipantInLobby,
  type JoinMeetingResponseData,
  type JoinRequestStatusResponseData,
  type MeetingParticipantStatus,
} from "@/service/meeting.service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Homeheader from "../layout/home.header";

type LobbyJoinPayload = {
  title?: string | null;
  userName: string;
  guestId?: string | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  livekitToken?: string | null;
  meetingToken?: string | null;
  participantStatus?: string | null;
  hostId?: string | null;
  hostName?: string | null;
};

type LobbyPendingJoinState = LobbyJoinPayload;

type LobbyProps = {
  meetingCode: string;
  onJoin: (payload: LobbyJoinPayload) => void;
  onMeetingEnded: () => void;
};

export type { LobbyJoinPayload };

const WAITING_APPROVAL_IMAGE_SRC = "/images/waitting.png";
const DEVICE_MENU_MIN_WIDTH_CLASS = "min-w-57.5";
type DeviceMenuKey =
  | "preview-camera"
  | "preview-mic"
  | "selector-camera"
  | "selector-mic"
  | null;

function createGuestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function getApiErrorDescription(error: IBackendRes<unknown>) {
  if (Array.isArray(error.errors)) {
    return error.errors[0];
  }

  if (typeof error.errors === "string") {
    return error.errors;
  }

  if (typeof error.error === "string") {
    return error.error;
  }

  return error.message;
}

function getWaitingMessage(message: MeetingSocketMessage) {
  const action = message.action?.trim().toUpperCase();

  if (action === "ADMITTED") {
    return "The host admitted you to the meeting.";
  }

  if (action === "REJECTED") {
    return "The host declined this join request.";
  }

  return "Waiting for the host to respond.";
}

function getGuestJoinRequest(payload?: LobbyJoinPayload | null) {
  if (!payload?.guestId?.trim() || !payload.userName.trim()) {
    return undefined;
  }

  return {
    guestId: payload.guestId.trim(),
    guestName: payload.userName.trim(),
  };
}

function getCancelJoinMessage(payload?: LobbyJoinPayload | null): MeetingSocketMessage | undefined {
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

function getCancelJoinRequest(payload?: LobbyJoinPayload | null) {
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

function getApiStatusCode(value?: number | string) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function shouldTreatPendingJoinErrorAsMeetingEnded(error: IBackendRes<unknown>) {
  const statusCode = getApiStatusCode(error.statusCode ?? error.status);
  const description = getMeetingApiErrorDescription(error)?.toLowerCase() || "";

  return statusCode === 404 || description.includes("already ended");
}

function areLobbyJoinStatesEqual(
  currentState?: LobbyPendingJoinState | null,
  nextState?: LobbyPendingJoinState | null,
) {
  if (!currentState || !nextState) {
    return currentState === nextState;
  }

  return currentState.title === nextState.title
    && currentState.userName === nextState.userName
    && currentState.guestId === nextState.guestId
    && currentState.isMicOn === nextState.isMicOn
    && currentState.isCameraOn === nextState.isCameraOn
    && currentState.livekitToken === nextState.livekitToken
    && currentState.meetingToken === nextState.meetingToken
    && currentState.participantStatus === nextState.participantStatus
    && currentState.hostId === nextState.hostId
    && currentState.hostName === nextState.hostName;
}

export default function Lobby({ meetingCode, onJoin, onMeetingEnded }: LobbyProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthSession();
  const initialMeetingSession = readInstantMeetingSession(meetingCode);
  const initialParticipantStatus = normalizeMeetingParticipantStatus(
    initialMeetingSession?.participantStatus,
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const waitingSocketRef = useRef<ReturnType<typeof connectMeetingSocket> | null>(null);
  const pendingJoinStateRef = useRef<LobbyPendingJoinState | null>(null);
  const disconnectCancelTimeoutRef = useRef<number | null>(null);
  const hasTriggeredUnloadCancelRef = useRef(false);
  const hasHandledMeetingEndedRef = useRef(false);
  const hasCompletedPendingJoinRef = useRef(false);
  const isMountedRef = useRef(true);
  const sessionUserName = user?.fullName?.trim() || user?.email?.trim() || "";
  const initialGuestName = !sessionUserName ? initialMeetingSession?.userName?.trim() || "" : "";
  const [userNameOverride, setUserNameOverride] = useState(initialGuestName);
  const [hasEditedName, setHasEditedName] = useState(Boolean(initialGuestName));
  const [guestId] = useState(() => {
    return initialMeetingSession?.guestId?.trim() || createGuestId();
  });
  const [isCameraOn, setIsCameraOn] = useState(initialMeetingSession?.isCameraOn ?? true);
  const [isMicOn, setIsMicOn] = useState(initialMeetingSession?.isMicOn ?? true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [openMenu, setOpenMenu] = useState<DeviceMenuKey>(null);
  const [deviceError, setDeviceError] = useState("");
  const [waitingSocketError, setWaitingSocketError] = useState("");
  const [isWaitingSocketConnected, setIsWaitingSocketConnected] = useState(false);
  const [waitingSocketRetryKey, setWaitingSocketRetryKey] = useState(0);
  const [pendingJoinState, setPendingJoinState] = useState<LobbyPendingJoinState | null>(() => {
    if (!initialMeetingSession || !shouldHandleMeetingParticipantInLobby(initialParticipantStatus)) {
      return null;
    }

    return {
      title: initialMeetingSession.title ?? null,
      userName: initialMeetingSession.userName,
      guestId: initialMeetingSession.guestId ?? null,
      isMicOn: initialMeetingSession.isMicOn,
      isCameraOn: initialMeetingSession.isCameraOn,
      livekitToken: initialMeetingSession.livekitToken ?? null,
      meetingToken: initialMeetingSession.meetingToken ?? null,
      participantStatus: initialParticipantStatus,
      hostId: initialMeetingSession.hostId ?? null,
      hostName: initialMeetingSession.hostName ?? null,
    };
  });

  const hasAccessToken =
    typeof window !== "undefined" ? Boolean(readStoredAccessToken()) : false;
  const isSignedIn = isAuthenticated && hasAccessToken;
  const rawUserName = isSignedIn
    ? sessionUserName
    : hasEditedName
      ? userNameOverride
      : "";
  const userName = rawUserName.trim();
  const displayName = userName || pendingJoinState?.userName?.trim() || "Guest";
  const canJoinMeeting = userName.length > 0;
  const meetingName = meetingCode ? meetingCode : "your meeting";
  const initials = getAvatarInitials(user?.email?.trim() || displayName, "G");
  const pendingParticipantStatus = normalizeMeetingParticipantStatus(
    pendingJoinState?.participantStatus,
  );
  const isWaitingForApproval = isMeetingParticipantAwaitingApproval(pendingParticipantStatus);
  const isRejected =
    pendingJoinState !== null
    && pendingParticipantStatus !== null
    && !isWaitingForApproval
    && pendingParticipantStatus !== "ACCEPT";

  const clearDisconnectCancelTimeout = useCallback(() => {
    if (disconnectCancelTimeoutRef.current !== null) {
      window.clearTimeout(disconnectCancelTimeoutRef.current);
      disconnectCancelTimeoutRef.current = null;
    }
  }, []);

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

  const buildResolvedJoinPayload = useCallback((
    responseData: JoinMeetingResponseData | JoinRequestStatusResponseData | null | undefined,
    baseState: LobbyPendingJoinState,
  ) => {
    const participantStatus = normalizeMeetingParticipantStatus(
      responseData?.participantStatus,
    );
    const livekitToken = responseData?.livekitToken?.trim() || null;
    const meetingToken = responseData?.meetingToken?.trim() || baseState.meetingToken || null;
    const resolvedMeetingCode = responseData?.meetingCode?.trim() || meetingCode;

    return {
      participantStatus,
      resolvedMeetingCode,
      joinPayload: {
        ...baseState,
        title: responseData?.title?.trim() || baseState.title || null,
        isMicOn,
        isCameraOn,
        livekitToken,
        meetingToken,
        participantStatus,
        hostId: responseData?.host?.id?.toString() ?? baseState.hostId ?? null,
        hostName: responseData?.host?.fullName?.trim() || baseState.hostName || null,
      } satisfies LobbyJoinPayload,
    };
  }, [isCameraOn, isMicOn, meetingCode]);

  const handleMeetingEnded = useEffectEvent(() => {
    if (hasHandledMeetingEndedRef.current) {
      return;
    }

    hasHandledMeetingEndedRef.current = true;
    clearDisconnectCancelTimeout();
    waitingSocketRef.current?.disconnect();
    waitingSocketRef.current = null;
    clearInstantMeetingSession(meetingCode);
    setPendingJoinState(null);
    setIsWaitingSocketConnected(false);
    setWaitingSocketError("");
    toast.error("Meeting ended", {
      description: "The host ended this meeting while your join request was still pending.",
    });
    onMeetingEnded();
  });

  const completeApprovedJoin = useEffectEvent((
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
  });

  const requestApprovedJoin = useCallback(async (nextPendingJoinState: LobbyPendingJoinState) => {
    const response = await meetingApi.joinMeeting(
      meetingCode,
      nextPendingJoinState.guestId?.trim() && nextPendingJoinState.userName.trim()
        ? {
          guestId: nextPendingJoinState.guestId.trim(),
          guestName: nextPendingJoinState.userName.trim(),
        }
        : undefined,
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
          : getApiErrorDescription(apiError) || "Please try again in a moment.";

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
    meetingCode,
    onJoin,
    persistLobbySession,
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
        payload.guestId?.trim() && payload.userName.trim()
          ? {
            guestId: payload.guestId.trim(),
            guestName: payload.userName.trim(),
          }
          : undefined,
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

        // OLD: the waiting view relied on websocket events only after the first join request.
        // NEW: keep the pending request in session/state and let the API resync current status after reconnect.
        persistLobbySession(resolvedMeetingCode, nextJoinPayload, participantStatus);
        setIsWaitingSocketConnected(false);
        updatePendingJoinState(nextJoinPayload);
        setWaitingSocketError("");
        setWaitingSocketRetryKey((currentValue) => currentValue + 1);
        toast.success("Request sent", {
          description: "Stay on this page while the host reviews your request.",
        });
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
      toast.error("Unable to join meeting", {
        description: getApiErrorDescription(error) || "Please try again in a moment.",
      });
    },
  });

  useEffect(() => {
    ensureMeetingAudioReady();
  }, []);

  useEffect(() => {
    pendingJoinStateRef.current = pendingJoinState;
  }, [pendingJoinState]);

  useEffect(() => {
    if (isWaitingForApproval && pendingJoinState) {
      hasTriggeredUnloadCancelRef.current = false;
      hasCompletedPendingJoinRef.current = false;
      return;
    }

    clearDisconnectCancelTimeout();
  }, [clearDisconnectCancelTimeout, isWaitingForApproval, pendingJoinState]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
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
  }, [isWaitingForApproval, isWaitingSocketConnected, pendingJoinState, syncPendingJoinStatus]);

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
        if (cancelMessage && waitingSocketRef.current?.isConnected()) {
          waitingSocketRef.current.sendCancel({
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

      waitingSocketRef.current?.disconnect();
      waitingSocketRef.current = null;
    };

    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);

    return () => {
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
    };
  }, [isWaitingForApproval, meetingCode, pendingJoinState]);

  useEffect(() => {
    if (!pendingJoinState || !isWaitingForApproval) {
      waitingSocketRef.current?.disconnect();
      waitingSocketRef.current = null;
      return;
    }

    if (!pendingJoinState.meetingToken) {
      return;
    }

    waitingSocketRef.current?.disconnect();
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
        // OLD: reconnect only restored the websocket subscription, so approvals/rejections that happened
        // while this tab was offline could be missed silently.
        // NEW: resync the persisted join request from the API on every successful reconnect.
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
      connection.disconnect();
      clearDisconnectCancelTimeout();

      if (waitingSocketRef.current === connection) {
        waitingSocketRef.current = null;
      }
    };
  }, [
    clearDisconnectCancelTimeout,
    completeApprovedJoin,
    isWaitingForApproval,
    meetingCode,
    onJoin,
    pendingJoinState,
    requestApprovedJoin,
    syncPendingJoinStatus,
    updatePendingJoinState,
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
  ]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function loadDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const microphones = devices.filter((device) => device.kind === "audioinput");

    setVideoDevices(cameras);
    setAudioDevices(microphones);
    setSelectedCamera((current) => current || cameras[0]?.deviceId || "");
    setSelectedMic((current) => current || microphones[0]?.deviceId || "");
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setDeviceError("This browser does not support camera or microphone preview.");
        return;
      }

      if (!isCameraOn && !isMicOn) {
        stopStream();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isCameraOn ? { deviceId: selectedCamera || undefined } : false,
          audio: isMicOn ? { deviceId: selectedMic || undefined } : false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        stopStream();
        streamRef.current = stream;
        setDeviceError("");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }

        await loadDevices();
      } catch {
        stopStream();
        setDeviceError("Allow camera and microphone access to use the lobby preview.");
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isCameraOn, isMicOn, selectedCamera, selectedMic]);

  const renderDeviceMenu = (
    devices: MediaDeviceInfo[],
    selectedDeviceId: string,
    onSelect: (deviceId: string) => void,
    fallbackPrefix: string,
  ) => {
    if (devices.length === 0) {
      return (
        <div className="rounded-lg border border-border/70 bg-card p-3 text-sm text-muted-foreground shadow-lg">
          No devices found.
        </div>
      );
    }

    return (
      <div className={`absolute bottom-full right-0 mb-2 ${DEVICE_MENU_MIN_WIDTH_CLASS} rounded-lg border border-border bg-card p-2 shadow-lg`}>
        {devices.map((device) => (
          <button
            key={device.deviceId}
            type="button"
            onClick={() => {
              onSelect(device.deviceId);
              setOpenMenu(null);
            }}
            className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-muted"
          >
            <span className="truncate text-sm">
              {device.label || `${fallbackPrefix} ${device.deviceId.slice(0, 5)}`}
            </span>
            {selectedDeviceId === device.deviceId ? (
              <Check className="h-4 w-4 text-primary" />
            ) : null}
          </button>
        ))}
      </div>
    );
  };

  const renderDeviceSelector = ({
    menuKey,
    label,
    devices,
    selectedDeviceId,
    onSelect,
    icon,
  }: {
    menuKey: "selector-camera" | "selector-mic";
    label: string;
    devices: MediaDeviceInfo[];
    selectedDeviceId: string;
    onSelect: (deviceId: string) => void;
    icon: ReactNode;
  }) => (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => setOpenMenu(openMenu === menuKey ? null : menuKey)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-full border border-border/70 bg-background/90 px-4 text-sm text-foreground shadow-sm transition hover:bg-muted/60"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
            {icon}
          </span>
          <span className="truncate">
            {devices.find((device) => device.deviceId === selectedDeviceId)?.label || label}
          </span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {openMenu === menuKey
        ? renderDeviceMenu(
          devices,
          selectedDeviceId,
          onSelect,
          menuKey === "selector-camera" ? "Camera" : "Microphone",
        )
        : null}
    </div>
  );

  const renderPreviewCard = () => (
    <Card className="relative aspect-video overflow-hidden rounded-4xl border border-border/70 bg-black p-0 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
      {isCameraOn ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover scale-x-[-1]"
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-gray-800 to-gray-900">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-4xl font-semibold text-white">
              {initials}
            </div>
            <p className="text-sm text-white/70">Camera is off</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 max-w-[70%] rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium">{displayName || "Guest"}</p>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-background/90 p-1 backdrop-blur-sm">
          <Button
            onClick={() => {
              setIsCameraOn((value) => !value);
              setOpenMenu(null);
            }}
            variant={isCameraOn ? "ghost" : "destructive"}
            size="icon-lg"
            className="rounded-full"
          >
            {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setOpenMenu(openMenu === "preview-camera" ? null : "preview-camera")}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            {openMenu === "preview-camera"
              ? renderDeviceMenu(videoDevices, selectedCamera, setSelectedCamera, "Camera")
              : null}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-background/90 p-1 backdrop-blur-sm">
          <Button
            onClick={() => {
              setIsMicOn((value) => !value);
              setOpenMenu(null);
            }}
            variant={isMicOn ? "ghost" : "destructive"}
            size="icon-lg"
            className="rounded-full"
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-full"
              onClick={() => setOpenMenu(openMenu === "preview-mic" ? null : "preview-mic")}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            {openMenu === "preview-mic"
              ? renderDeviceMenu(audioDevices, selectedMic, setSelectedMic, "Microphone")
              : null}
          </div>
        </div>
      </div>
    </Card>
  );

  if (isWaitingForApproval && pendingJoinState) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_42%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-linear-to-t from-card/35 to-transparent" />

        <div className="relative flex w-full max-w-3xl flex-col items-center justify-center text-center">
          {WAITING_APPROVAL_IMAGE_SRC ? (
            <Image
              src={WAITING_APPROVAL_IMAGE_SRC}
              alt="Waiting for host approval"
              width={640}
              height={480}
              priority
              className="h-auto w-full max-w-md object-contain"
            />
          ) : (
            <div className="flex h-72 w-full max-w-md items-center justify-center rounded-4xl border border-dashed border-border/70 bg-card/20 px-6 text-sm text-muted-foreground">
              Set your waiting-room image here
            </div>
          )}

          <div className="mt-8 flex items-center gap-2 text-base text-foreground sm:text-lg">
            {isWaitingSocketConnected ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Please wait until the meeting host admits you into the call.</span>
          </div>

          {waitingSocketError ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {waitingSocketError}
            </p>
          ) : null}


        </div>
      </div>
    );
  }

  if (isRejected && pendingJoinState) {
    return (
      <div className="min-h-screen bg-background">
        <Homeheader />

        <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-3xl items-center px-6 py-10">
          <Card className="w-full border border-border/70 bg-background/90 p-8 shadow-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <XCircle className="h-7 w-7" />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Request Declined
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                The host didn&apos;t admit this request
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                You can go back to the lobby setup and send another request later, or return to the homepage now.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                className="h-12"
                onClick={() => {
                  setIsWaitingSocketConnected(false);
                  setWaitingSocketError("");
                  setPendingJoinState(null);
                  clearInstantMeetingSession(meetingCode);
                }}
              >
                Request again
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12"
                onClick={() => router.push("/")}
              >
                Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)] xl:gap-12">
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {meetingName}
                </h1>
              </div>
            </div>

            {renderPreviewCard()}

            <div className="grid gap-3 sm:grid-cols-2">
              {renderDeviceSelector({
                menuKey: "selector-mic",
                label: "Choose microphone",
                devices: audioDevices,
                selectedDeviceId: selectedMic,
                onSelect: setSelectedMic,
                icon: <Mic className="h-4 w-4" />,
              })}
              {renderDeviceSelector({
                menuKey: "selector-camera",
                label: "Choose camera",
                devices: videoDevices,
                selectedDeviceId: selectedCamera,
                onSelect: setSelectedCamera,
                icon: <Video className="h-4 w-4" />,
              })}
            </div>

            {deviceError ? <p className="text-sm text-destructive">{deviceError}</p> : null}
          </section>

          <aside className="xl:pt-20">
            <Card className="rounded-4xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur-sm sm:p-7">
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                    Ready to join
                  </h2>
                </div>

                <Input
                  id="lobby-user-name"
                  value={rawUserName}
                  onChange={(event) => {
                    setHasEditedName(true);
                    setUserNameOverride(event.target.value);
                  }}
                  placeholder="Enter your name to join"
                  className="h-12 rounded-xl text-base"
                  maxLength={80}
                  disabled={isSignedIn}
                />

                <Button
                  onClick={() =>
                    joinMeetingMutation.mutate({
                      userName,
                      guestId: isSignedIn ? null : guestId,
                      isMicOn,
                      isCameraOn,
                    })
                  }
                  size="lg"
                  className="h-14 w-full rounded-full text-base sm:text-lg"
                  disabled={joinMeetingMutation.isPending || !canJoinMeeting}
                >
                  {joinMeetingMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : null}
                  Request to join
                </Button>




              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
