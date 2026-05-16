/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/preserve-manual-memoization */
"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Monitor, UserPlus, Users } from "lucide-react";
import {
  Participant as LiveKitParticipant,
  Room as LiveKitRoom,
} from "livekit-client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/user-avatar";
import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import { useAuthSession } from "@/lib/auth/auth-session";
import { getLiveKitWebsocketUrl } from "@/lib/config/api-url";
import { cn } from "@/lib/utils";
import {
  ensureMeetingAudioReady,
  HOST_WAITING_REQUEST_AUDIO_SRC,
} from "@/lib/meeting/lobby-audio";
import {
  decodeMeetingToken,
  type MeetingSocketConnection,
} from "@/lib/meeting/meeting-websocket";
import { MeetingSocketProvider, useMeetingSocket } from "@/features/meeting/providers";
import { useLiveKitRoom } from "@/features/livekit/hooks";
import {
  areParticipantsEqual,
  decodeJwtPayload,
  getFallbackLocalParticipant,
  getParticipantRoleFromMetadata,
  mapParticipantToUiParticipant,
} from "@/features/meeting/room/lib";
import { useRoomChat, useRoomDevices, useWaitingRoomRequests } from "@/features/meeting/room/hooks";
import { meetingApi } from "@/shared/services/meeting.service";

import RoomFooter from "./room-footer";
import RoomSidebar from "./room-sidebar";
import RoomStage from "./room-stage";
import type {
  MeetingRoomProps,
  Participant,
  SidebarPanel,
  WaitingParticipant,
} from "./types";
import {
  getDefaultParticipantHandState,
  getParticipantHandAttributes,
  getParticipantHandState,
  getInitials,
  sortParticipantsByRaisedHand,
  type ParticipantHandState,
} from "./utils";

const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
};

const HAND_RAISE_COOLDOWN_MS = 1800;
const SIDEBAR_LAYOUT_TRANSITION_MS = 240;
const VIEWPORT_RESIZE_SETTLE_MS = 180;

function getIsDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function getScreenShareTabLabel(participant: Participant) {
  return participant.isLocal ? "You" : participant.name;
}

export default function MeetingRoom(props: MeetingRoomProps) {
  return (
    <MeetingSocketProvider>
      <MeetingRoomContent {...props} />
    </MeetingSocketProvider>
  );
}

function MeetingRoomContent({
  meetingCode,
  title,
  userName,
  isMicOn,
  isCameraOn,
  livekitToken,
  meetingToken,
  hostId,
  hostName,
  onLeave,
}: MeetingRoomProps) {
  const { user } = useAuthSession();
  const {
    connect: connectMeetingSocket,
    disconnect: disconnectMeetingSocket,
    sendAccept,
    sendReject,
    sendKickout,
  } = useMeetingSocket();
  const localEmail = user?.email?.trim() || null;
  const localAvatarUrl = user?.avatarUrl?.trim() || null;
  const displayName = userName.trim() || "Guest";
  const meetingTitle = title?.trim() || "Untitled meeting";
  const liveKitUrl = getLiveKitWebsocketUrl();
  const isLiveKitEnabled = Boolean(livekitToken && liveKitUrl);
  const decodedMeetingToken = decodeMeetingToken(meetingToken);
  const localMeetingRole = decodedMeetingToken.role;
  const localTokenPayload = decodeJwtPayload<{
    sub?: string;
    metadata?: string;
  }>(livekitToken);
  const localRole = getParticipantRoleFromMetadata(localTokenPayload?.metadata);
  const resolvedHostId =
    hostId?.trim()
    || (localRole === "HOST" ? localTokenPayload?.sub?.trim() || null : null);
  const resolvedHostName = hostName?.trim() || null;
  const roomRef = useRef<LiveKitRoom | null>(null);
  const meetingSocketRef = useRef<MeetingSocketConnection | null>(null);
  const hostWaitingRequestAudioRef = useRef<HTMLAudioElement | null>(null);
  const activePanelRef = useRef<SidebarPanel>(null);
  const localHandStateRef = useRef<ParticipantHandState>(getDefaultParticipantHandState());
  const preferLocalHandStateRef = useRef(false);
  const nextHandRaiseAllowedAtRef = useRef(0);
  const handRaiseCooldownTimeoutRef = useRef<number | null>(null);
  const hasExitedMeetingRef = useRef(false);
  const [isMicEnabled, setIsMicEnabled] = useState(isMicOn);
  const [isCameraEnabled, setIsCameraEnabled] = useState(isCameraOn);
  const [activePanel, setActivePanel] = useState<SidebarPanel>(null);
  const [renderedPanel, setRenderedPanel] = useState<SidebarPanel>(null);
  const [isSidebarLayoutTransitioning, setIsSidebarLayoutTransitioning] = useState(false);
  const [isViewportResizing, setIsViewportResizing] = useState(false);
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [liveKitError, setLiveKitError] = useState<string | null>(null);
  const [canPlaybackAudio, setCanPlaybackAudio] = useState(true);
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(() => getIsDocumentVisible());
  const [activeScreenShareId, setActiveScreenShareId] = useState<string | null>(null);
  const [isWaitingMenuOpen, setIsWaitingMenuOpen] = useState(false);
  const [isParticipantsMenuOpen, setIsParticipantsMenuOpen] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [isHandRaiseCoolingDown, setIsHandRaiseCoolingDown] = useState(false);
  const [localHandState, setLocalHandState] = useState<ParticipantHandState>(
    getDefaultParticipantHandState(),
  );
  const [preferLocalHandState, setPreferLocalHandState] = useState(false);
  const waitingMenuRef = useRef<HTMLDivElement | null>(null);
  const participantsMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarCloseTimeoutRef = useRef<number | null>(null);
  const sidebarLayoutTimeoutRef = useRef<number | null>(null);
  const viewportResizeTimeoutRef = useRef<number | null>(null);
  const isViewportResizingRef = useRef(false);
  const waitingMenuCloseTimeoutRef = useRef<number | null>(null);
  const participantsMenuCloseTimeoutRef = useRef<number | null>(null);

  const canManageWaitingRoom = localMeetingRole === "HOST" || localRole === "HOST";

  const handleRoomDeviceError = useCallback((message: string) => {
    setLiveKitError(message);
  }, []);

  const {
    microphoneDevices,
    cameraDevices,
    activeMicrophoneId,
    activeCameraId,
    syncAvailableDevices,
    handleSelectMicrophone,
    handleSelectCamera,
  } = useRoomDevices({
    roomRef,
    isLiveKitEnabled,
    onError: handleRoomDeviceError,
  });

  const {
    chatMessages,
    chatDraft,
    isSendingChat,
    unreadChatCount,
    setChatDraft,
    resetChat,
    clearUnreadChatCount,
    handleLiveKitChatMessage,
    handleSendChatMessage,
  } = useRoomChat({
    roomRef,
    activePanelRef,
    isLiveKitEnabled,
    displayName,
    localEmail,
    localAvatarUrl,
    onError: handleRoomDeviceError,
  });

  const {
    waitingParticipants,
    clearWaitingParticipants,
    upsertWaitingParticipant,
    removeWaitingParticipant,
    syncWaitingParticipants,
    requestWaitingRoomResync,
  } = useWaitingRoomRequests({
    canManageWaitingRoom,
    meetingCode,
    meetingToken,
    hostWaitingRequestAudioRef,
    onError: handleRoomDeviceError,
  });

  const exitMeeting = useCallback((reason: "left" | "ended" = "left") => {
    if (hasExitedMeetingRef.current) {
      return;
    }

    hasExitedMeetingRef.current = true;
    setLocalHandState(getDefaultParticipantHandState());
    setPreferLocalHandState(false);
    disconnectMeetingSocket(meetingSocketRef.current);
    meetingSocketRef.current = null;
    roomRef.current?.disconnect();
    onLeave(reason);
  }, [disconnectMeetingSocket, onLeave]);

  const reportLeaveMeeting = useCallback(() => {
    const participantId = decodedMeetingToken.participantId;

    if (participantId === null) {
      return;
    }

    // OLD: leaving only disconnected LiveKit locally, so the backend participant status could stay ACCEPT.
    // NEW: notify the existing backend leave endpoint as best-effort before the page transitions away.
    void meetingApi.leaveMeeting(meetingCode, participantId, meetingToken, {
      keepalive: true,
    }).then((response) => {
      assertApiSuccess(response);
    }).catch(() => undefined);
  }, [decodedMeetingToken.participantId, meetingCode, meetingToken]);

  const handleLiveKitReset = useCallback(() => {
    setIsRoomConnected(false);
    resetChat();
  }, [resetChat]);

  const handleLiveKitError = useCallback((error: Error | null) => {
    setLiveKitError(error?.message ?? null);
  }, []);

  const handleLiveKitDeviceChange = useCallback((room: LiveKitRoom) => {
    void syncAvailableDevices(room);
  }, [syncAvailableDevices]);

  const handleLiveKitLocalAttributesChange = useCallback((participant: LiveKitParticipant) => {
    const nextLocalHandState = getParticipantHandState(participant.attributes);
    setLocalHandState(nextLocalHandState);
    setPreferLocalHandState(false);
  }, []);

  const localMeetingParticipantId = decodedMeetingToken.participantId;

  const handleLiveKitParticipantsChange = useCallback((room: LiveKitRoom) => {
    const nextParticipants = [
      mapParticipantToUiParticipant(
        room.localParticipant,
        displayName,
        localEmail,
        localAvatarUrl,
        resolvedHostId,
        resolvedHostName,
        localRole,
        localHandStateRef.current,
        preferLocalHandStateRef.current,
        localMeetingParticipantId,
      ),
      ...Array.from(room.remoteParticipants.values()).map((participant) =>
        mapParticipantToUiParticipant(
          participant,
          displayName,
          localEmail,
          localAvatarUrl,
          resolvedHostId,
          resolvedHostName,
          localRole,
          localHandStateRef.current,
          false,
        ),
      ),
    ];

    setLiveParticipants((currentParticipants) =>
      areParticipantsEqual(currentParticipants, nextParticipants)
        ? currentParticipants
        : nextParticipants,
    );
  }, [displayName, localAvatarUrl, localEmail, localMeetingParticipantId, localRole, resolvedHostId, resolvedHostName]);

  const liveKitRoomRef = useLiveKitRoom({
    enabled: isLiveKitEnabled,
    token: livekitToken,
    url: liveKitUrl,
    options: LIVEKIT_ROOM_OPTIONS,
    initialCameraEnabled: isCameraOn,
    initialMicrophoneEnabled: isMicOn,
    onConnectionChange: setIsRoomConnected,
    onAudioPlaybackChange: setCanPlaybackAudio,
    onParticipantsChange: handleLiveKitParticipantsChange,
    onLocalAttributesChange: handleLiveKitLocalAttributesChange,
    onChatMessage: handleLiveKitChatMessage,
    onDeviceChange: handleLiveKitDeviceChange,
    onError: handleLiveKitError,
    onReset: handleLiveKitReset,
  });

  useEffect(() => {
    // Keep the internal roomRef in sync with the liveKitRoomRef after render
    roomRef.current = liveKitRoomRef.current;
  });

  useEffect(() => {
    ensureMeetingAudioReady();
    hostWaitingRequestAudioRef.current?.load();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(getIsDocumentVisible());
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const settleViewportResize = () => {
      isViewportResizingRef.current = false;
      viewportResizeTimeoutRef.current = null;
      setIsViewportResizing(false);
    };

    const handleViewportResize = () => {
      if (!isViewportResizingRef.current) {
        isViewportResizingRef.current = true;
        setIsViewportResizing(true);
      }

      if (viewportResizeTimeoutRef.current !== null) {
        window.clearTimeout(viewportResizeTimeoutRef.current);
      }

      viewportResizeTimeoutRef.current = window.setTimeout(
        settleViewportResize,
        VIEWPORT_RESIZE_SETTLE_MS,
      );
    };

    window.addEventListener("resize", handleViewportResize);

    return () => {
      window.removeEventListener("resize", handleViewportResize);

      if (viewportResizeTimeoutRef.current !== null) {
        window.clearTimeout(viewportResizeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    activePanelRef.current = activePanel;
  }, [activePanel]);

  useEffect(() => {
    if (sidebarCloseTimeoutRef.current !== null) {
      window.clearTimeout(sidebarCloseTimeoutRef.current);
      sidebarCloseTimeoutRef.current = null;
    }

    if (activePanel) {
      setRenderedPanel(activePanel);
    } else {
      sidebarCloseTimeoutRef.current = window.setTimeout(() => {
        setRenderedPanel(null);
        sidebarCloseTimeoutRef.current = null;
      }, SIDEBAR_LAYOUT_TRANSITION_MS);
    }
  }, [activePanel]);

  useEffect(() => () => {
    if (sidebarCloseTimeoutRef.current !== null) {
      window.clearTimeout(sidebarCloseTimeoutRef.current);
    }

    if (sidebarLayoutTimeoutRef.current !== null) {
      window.clearTimeout(sidebarLayoutTimeoutRef.current);
    }

    if (viewportResizeTimeoutRef.current !== null) {
      window.clearTimeout(viewportResizeTimeoutRef.current);
    }

    if (handRaiseCooldownTimeoutRef.current !== null) {
      window.clearTimeout(handRaiseCooldownTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    localHandStateRef.current = localHandState;
  }, [localHandState]);

  useEffect(() => {
    preferLocalHandStateRef.current = preferLocalHandState;
  }, [preferLocalHandState]);

  useEffect(() => {
    if (activePanel === "chat") {
      clearUnreadChatCount();
    }
  }, [activePanel, clearUnreadChatCount]);

  useEffect(() => {
    if (!canManageWaitingRoom) {
      setIsWaitingMenuOpen(false);
    }
  }, [canManageWaitingRoom]);

  useEffect(() => {
    if (!isWaitingMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (waitingMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsWaitingMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWaitingMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isWaitingMenuOpen]);

  useEffect(() => {
    if (!isParticipantsMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (participantsMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsParticipantsMenuOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsParticipantsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isParticipantsMenuOpen]);

  useEffect(() => {
    return () => {
      if (waitingMenuCloseTimeoutRef.current !== null) {
        window.clearTimeout(waitingMenuCloseTimeoutRef.current);
      }

      if (participantsMenuCloseTimeoutRef.current !== null) {
        window.clearTimeout(participantsMenuCloseTimeoutRef.current);
      }
    };
  }, []);

  const clearWaitingMenuCloseTimeout = useCallback(() => {
    if (waitingMenuCloseTimeoutRef.current !== null) {
      window.clearTimeout(waitingMenuCloseTimeoutRef.current);
      waitingMenuCloseTimeoutRef.current = null;
    }
  }, []);

  const openWaitingMenu = useCallback(() => {
    clearWaitingMenuCloseTimeout();
    setIsWaitingMenuOpen(true);
  }, [clearWaitingMenuCloseTimeout]);

  const scheduleWaitingMenuClose = useCallback(() => {
    clearWaitingMenuCloseTimeout();
    waitingMenuCloseTimeoutRef.current = window.setTimeout(() => {
      setIsWaitingMenuOpen(false);
      waitingMenuCloseTimeoutRef.current = null;
    }, 180);
  }, [clearWaitingMenuCloseTimeout]);

  const clearParticipantsMenuCloseTimeout = useCallback(() => {
    if (participantsMenuCloseTimeoutRef.current !== null) {
      window.clearTimeout(participantsMenuCloseTimeoutRef.current);
      participantsMenuCloseTimeoutRef.current = null;
    }
  }, []);

  const openParticipantsMenu = useCallback(() => {
    clearParticipantsMenuCloseTimeout();
    setIsParticipantsMenuOpen(true);
  }, [clearParticipantsMenuCloseTimeout]);

  const scheduleParticipantsMenuClose = useCallback(() => {
    clearParticipantsMenuCloseTimeout();
    participantsMenuCloseTimeoutRef.current = window.setTimeout(() => {
      setIsParticipantsMenuOpen(false);
      participantsMenuCloseTimeoutRef.current = null;
    }, 180);
  }, [clearParticipantsMenuCloseTimeout]);

  useEffect(() => {
    void syncAvailableDevices();
  }, [syncAvailableDevices]);

  useEffect(() => {
    if (!canManageWaitingRoom || !meetingToken) {
      clearWaitingParticipants();
      return;
    }

    // OLD: host waiting room only accumulated JOIN_REQUEST websocket events, so any request
    // created while the host tab was away disappeared from the UI after rejoin.
    // NEW: fetch the current pending list from the API whenever the host enters/re-enters the room.
    void syncWaitingParticipants();
  }, [canManageWaitingRoom, clearWaitingParticipants, meetingToken, syncWaitingParticipants]);

  useEffect(() => {
    disconnectMeetingSocket(meetingSocketRef.current);
    meetingSocketRef.current = null;

    if (!meetingToken) {
      clearWaitingParticipants();
      return;
    }

    if (!canManageWaitingRoom) {
      clearWaitingParticipants();
    }

    const connection = connectMeetingSocket({
      meetingCode,
      meetingToken,
      subscribeToMeetingTopic: true,
      subscribeToWaitingTopic: canManageWaitingRoom,
      subscribeToParticipantTopic: true,
      onConnect: () => {
        if (canManageWaitingRoom) {
          void syncWaitingParticipants();
        }
      },
      onWaitingMessage: (message) => {
        const action = message.action?.trim().toUpperCase();

        if (action === "JOIN_REQUEST") {
          upsertWaitingParticipant(message);
        }
      },
      onMeetingMessage: (message) => {
        const action = message.action?.trim().toUpperCase();

        if (
          action === "ADMITTED"
          || action === "REJECTED"
          || action === "PARTICIPANT_LEFT"
          || action === "WAITING_CANCELLED"
          || action === "LEFT"
        ) {
          removeWaitingParticipant(message.targetParticipantId);
          return;
        }

        if (action === "MEETING_ENDED") {
          toast.error("Meeting ended", {
            description: "The host ended the meeting for everyone.",
          });
          exitMeeting("ended");
          return;
        }

        if (action === "USER_KICKED") {
          const localParticipantId = decodedMeetingToken.participantId;

          if (
            message.targetParticipantId !== null
            && message.targetParticipantId !== undefined
            && localParticipantId !== null
            && message.targetParticipantId === localParticipantId
          ) {
            toast.error("Removed from meeting", {
              description: "You have been removed from the meeting by the host.",
            });
            exitMeeting("ended");
          } else if (message.targetName) {
            toast(`${message.targetName} was removed from the meeting.`);
          }
        }
      },
      onParticipantMessage: (message) => {
        const action = message.action?.trim().toUpperCase();

        if (
          action === "REJECT_SUCCESS"
          || action === "CANCEL_SUCCESS"
          || action === "PARTICIPANT_LEFT"
          || action === "WAITING_CANCELLED"
          || action === "LEFT"
        ) {
          removeWaitingParticipant(message.targetParticipantId);
          return;
        }

        if (action === "USER_KICKED") {
          const localParticipantId = decodedMeetingToken.participantId;

          if (
            message.targetParticipantId !== null
            && message.targetParticipantId !== undefined
            && localParticipantId !== null
            && message.targetParticipantId === localParticipantId
          ) {
            toast.error("Removed from meeting", {
              description: "You have been removed from the meeting by the host.",
            });
            exitMeeting("ended");
          }
        }
      },
      onError: (error) => {
        setLiveKitError(error.message);
      },
    });

    meetingSocketRef.current = connection;

    return () => {
      disconnectMeetingSocket(connection);

      if (meetingSocketRef.current === connection) {
        meetingSocketRef.current = null;
      }
    };
  }, [
    canManageWaitingRoom,
    clearWaitingParticipants,
    connectMeetingSocket,
    decodedMeetingToken.participantId,
    disconnectMeetingSocket,
    exitMeeting,
    meetingCode,
    meetingToken,
    removeWaitingParticipant,
    syncWaitingParticipants,
    upsertWaitingParticipant,
  ]);

  const fallbackLocalParticipantIsHost =
    localRole === "HOST"
    || localMeetingRole === "HOST"
    || (resolvedHostId !== null && localTokenPayload?.sub?.trim() === resolvedHostId)
    || (resolvedHostName !== null && displayName.trim().toLowerCase() === resolvedHostName.toLowerCase());

  const baseParticipants =
    isLiveKitEnabled
      ? liveParticipants.length > 0
        ? liveParticipants
        : [getFallbackLocalParticipant(displayName, localEmail, localAvatarUrl, isMicEnabled, isCameraEnabled, false, fallbackLocalParticipantIsHost, localHandState, localMeetingParticipantId)]
      : [getFallbackLocalParticipant(displayName, localEmail, localAvatarUrl, isMicEnabled, isCameraEnabled, false, fallbackLocalParticipantIsHost, localHandState, localMeetingParticipantId)];

  const screenShareParticipants = baseParticipants.filter((participant) => participant.isScreenSharing);
  const participants = screenShareParticipants.length > 0
    ? baseParticipants
    : sortParticipantsByRaisedHand(baseParticipants);
  const screenShareParticipant =
    screenShareParticipants.find((participant) => participant.id === activeScreenShareId)
    ?? screenShareParticipants[0]
    ?? null;
  const isScreenSharing = isLiveKitEnabled
    ? baseParticipants.some((participant) => participant.isLocal && participant.isScreenSharing)
    : false;

  useEffect(() => {
    if (screenShareParticipants.length === 0) {
      if (activeScreenShareId !== null) {
        setActiveScreenShareId(null);
      }
      return;
    }

    const activeShareStillVisible = screenShareParticipants.some(
      (participant) => participant.id === activeScreenShareId,
    );

    if (activeShareStillVisible) {
      return;
    }

    const preferredParticipant =
      screenShareParticipants.find((participant) => participant.isLocal)
      ?? screenShareParticipants[0];

    if (preferredParticipant && preferredParticipant.id !== activeScreenShareId) {
      setActiveScreenShareId(preferredParticipant.id);
    }
  }, [activeScreenShareId, screenShareParticipants]);

  const beginSidebarLayoutTransition = useCallback(() => {
    if (sidebarLayoutTimeoutRef.current !== null) {
      window.clearTimeout(sidebarLayoutTimeoutRef.current);
    }

    setIsSidebarLayoutTransitioning(true);
    sidebarLayoutTimeoutRef.current = window.setTimeout(() => {
      setIsSidebarLayoutTransitioning(false);
      sidebarLayoutTimeoutRef.current = null;
    }, SIDEBAR_LAYOUT_TRANSITION_MS + 80);
  }, []);

  const togglePanel = (panel: Exclude<SidebarPanel, null>) => {
    beginSidebarLayoutTransition();
    startTransition(() => {
      setActivePanel((currentPanel) =>
        currentPanel === panel ? null : panel
      );
    });
  };

  const handlePanelChange = (panel: SidebarPanel) => {
    if (panel !== activePanel) {
      beginSidebarLayoutTransition();
    }

    startTransition(() => {
      setActivePanel(panel);
    });
  };

  const handleScreenShare = () => {
    const room = roomRef.current;

    if (room && isLiveKitEnabled) {
      const nextValue = !isScreenSharing;

      void room.localParticipant.setScreenShareEnabled(nextValue).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unable to update screen sharing.";

        setLiveKitError(errorMessage);
      });
      return;
    }

    const errorMessage = "Screen sharing requires a LiveKit connection.";
    setLiveKitError(errorMessage);
    toast.error("Unable to share screen", {
      description: errorMessage,
    });
  };

  const handlePresentOtherContent = () => {
    const room = roomRef.current;

    if (room && isLiveKitEnabled) {
      void (async () => {
        if (isScreenSharing) {
          await room.localParticipant.setScreenShareEnabled(false);
        }

        await room.localParticipant.setScreenShareEnabled(true);
      })().catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unable to present different content.";

        setLiveKitError(errorMessage);
      });
      return;
    }

    const errorMessage = "Screen sharing requires a LiveKit connection.";
    setLiveKitError(errorMessage);
    toast.error("Unable to share screen", {
      description: errorMessage,
    });
  };

  const handleToggleMic = () => {
    const nextValue = !isMicEnabled;
    setIsMicEnabled(nextValue);

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      return;
    }

    void room.localParticipant.setMicrophoneEnabled(nextValue).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to update microphone.";

      setIsMicEnabled(!nextValue);
      setLiveKitError(errorMessage);
    });
  };

  const handleToggleCamera = () => {
    const nextValue = !isCameraEnabled;
    setIsCameraEnabled(nextValue);

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      return;
    }

    void room.localParticipant.setCameraEnabled(nextValue).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to update camera.";

      setIsCameraEnabled(!nextValue);
      setLiveKitError(errorMessage);
    });
  };

  const handleToggleHandRaise = () => {
    const now = Date.now();

    if (now < nextHandRaiseAllowedAtRef.current) {
      return;
    }

    const nextHandRaised = !localHandState.handRaised;
    const nextHandState: ParticipantHandState = {
      handRaised: nextHandRaised,
      handRaisedAt: nextHandRaised ? Date.now() : null,
    };

    nextHandRaiseAllowedAtRef.current = now + HAND_RAISE_COOLDOWN_MS;
    setIsHandRaiseCoolingDown(true);

    if (handRaiseCooldownTimeoutRef.current !== null) {
      window.clearTimeout(handRaiseCooldownTimeoutRef.current);
    }

    handRaiseCooldownTimeoutRef.current = window.setTimeout(() => {
      setIsHandRaiseCoolingDown(false);
      handRaiseCooldownTimeoutRef.current = null;
    }, HAND_RAISE_COOLDOWN_MS);

    setLocalHandState(nextHandState);
    setPreferLocalHandState(true);

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      return;
    }

    void room.localParticipant.setAttributes(getParticipantHandAttributes(nextHandState)).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to sync raised hand status.";

      setLiveKitError(errorMessage);
    });
  };

  const handleStartAudio = () => {
    const room = roomRef.current;

    if (!room) {
      return;
    }

    void room.startAudio().then(() => {
      setCanPlaybackAudio(true);
    }).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to start audio playback.";

      setLiveKitError(errorMessage);
    });
  };

  const handleLeaveMeeting = useCallback(() => {
    reportLeaveMeeting();
    exitMeeting("left");
  }, [exitMeeting, reportLeaveMeeting]);

  const handleEndMeeting = useCallback(() => {
    if (isEndingMeeting) {
      return;
    }

    setIsEndingMeeting(true);

    void meetingApi.endMeeting(meetingCode).then((response) => {
      assertApiSuccess(response);
      toast.success("Meeting ended", {
        description: "Everyone has been removed from the room.",
      });
      exitMeeting("ended");
    }).catch((error) => {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String((error as IBackendRes<unknown>).message || "Unable to end the meeting.")
          : "Unable to end the meeting.";

      setLiveKitError(errorMessage);
      toast.error("Unable to end meeting", {
        description: errorMessage,
      });
    }).finally(() => {
      setIsEndingMeeting(false);
    });
  }, [exitMeeting, isEndingMeeting, meetingCode]);

  const handleApproveWaitingParticipant = useCallback((participant: WaitingParticipant) => {
    try {
      sendAccept({
        meetingCode,
        targetParticipantId: participant.participantId,
        targetName: participant.name,
      });
      removeWaitingParticipant(participant.participantId);
      requestWaitingRoomResync();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to approve this participant.";

      setLiveKitError(errorMessage);
    }
  }, [meetingCode, removeWaitingParticipant, requestWaitingRoomResync, sendAccept]);

  const handleRejectWaitingParticipant = useCallback((participant: WaitingParticipant) => {
    try {
      sendReject({
        meetingCode,
        targetParticipantId: participant.participantId,
        targetName: participant.name,
      });
      removeWaitingParticipant(participant.participantId);
      requestWaitingRoomResync();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to reject this participant.";

      setLiveKitError(errorMessage);
    }
  }, [meetingCode, removeWaitingParticipant, requestWaitingRoomResync, sendReject]);

  const handleApproveAllWaitingParticipants = useCallback(() => {
    let hasQueuedResync = false;

    waitingParticipants.forEach((participant) => {
      try {
        sendAccept({
          meetingCode,
          targetParticipantId: participant.participantId,
          targetName: participant.name,
        });
        removeWaitingParticipant(participant.participantId);
        hasQueuedResync = true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unable to approve all waiting participants.";

        setLiveKitError(errorMessage);
      }
    });

    if (hasQueuedResync) {
      requestWaitingRoomResync();
    }
  }, [meetingCode, removeWaitingParticipant, requestWaitingRoomResync, sendAccept, waitingParticipants]);

  const handleKickParticipant = useCallback((participant: Participant, isBan: boolean) => {
    const targetParticipantId = participant.participantId;

    if (targetParticipantId === null) {
      toast.error("Unable to remove participant", {
        description: "This participant's ID could not be resolved.",
      });
      return;
    }

    try {
      sendKickout({
        meetingCode,
        targetParticipantId,
        targetName: participant.name,
        isBan,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to remove this participant.";
      toast.error("Unable to remove participant", {
        description: errorMessage,
      });
    }
  }, [meetingCode, sendKickout]);

  const sidebarPanel = activePanel ?? renderedPanel;
  const isSidebarOpen = Boolean(activePanel);
  const isSidebarRendered = Boolean(sidebarPanel);

  return (
    <div className="h-screen overflow-hidden bg-background">
      <audio
        ref={hostWaitingRequestAudioRef}
        src={HOST_WAITING_REQUEST_AUDIO_SRC}
        preload="auto"
        className="hidden"
      />
      <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_42%),linear-gradient(180deg,rgba(15,23,42,1),rgba(30,41,59,0.9))]">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 lg:px-5 lg:pt-4">
          <div className="pointer-events-auto grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,auto)_minmax(0,1fr)]">
            <div className="min-w-0 max-w-[min(24rem,calc(100vw-7rem))] px-1 py-1">
              <p className="truncate text-sm font-semibold text-white/95 lg:text-base">
                {meetingTitle}
              </p>
            </div>

            {screenShareParticipants.length > 0 ? (
              <div className="col-span-2 row-start-2 flex min-w-0 justify-center lg:col-span-1 lg:col-start-2 lg:row-start-1">
                <div className="flex min-w-0 max-w-[min(42rem,calc(100vw-2rem))] items-center gap-1.5 overflow-x-auto rounded-full border border-white/10 bg-slate-950/55 px-2 py-1 text-white shadow-[0_10px_28px_rgba(2,6,23,0.28)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <div className="flex shrink-0 items-center gap-1.5 px-1.5 text-[11px] font-medium text-white/75">
                    <Monitor className="h-3.5 w-3.5" />
                    <span>Presenting</span>
                  </div>

                  {screenShareParticipants.map((participant) => {
                    const isSelectedScreenShare = participant.id === screenShareParticipant?.id;

                    return (
                      <button
                        key={participant.id}
                        type="button"
                        onClick={() => setActiveScreenShareId(participant.id)}
                        aria-label={`View ${getScreenShareTabLabel(participant)} screen share`}
                        className={cn(
                          "flex h-7 shrink-0 items-center rounded-full border px-2.5 text-xs font-medium transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-safe:duration-200 motion-safe:ease-out motion-reduce:transform-none",
                          isSelectedScreenShare
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-white/10 bg-white/[0.08] text-white/75 hover:bg-white/[0.12] hover:text-white",
                        )}
                      >
                        <span className="max-w-28 truncate">
                          {getScreenShareTabLabel(participant)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 lg:col-start-3">
              {canManageWaitingRoom && waitingParticipants.length > 0 ? (
                <div
                  ref={waitingMenuRef}
                  className="relative after:absolute after:inset-x-0 after:top-full after:h-3 after:content-['']"
                  onMouseEnter={openWaitingMenu}
                  onMouseLeave={scheduleWaitingMenuClose}
                >
                  <button
                    type="button"
                    aria-label="Open waiting room requests"
                    aria-expanded={isWaitingMenuOpen}
                    onClick={() => {
                      clearWaitingMenuCloseTimeout();
                      setIsWaitingMenuOpen((currentValue) => !currentValue);
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-primary/25 bg-primary/15 px-2.5 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-3"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {waitingParticipants.length === 1
                        ? "Allow 1 guest in"
                        : `Allow ${waitingParticipants.length} guests in`}
                    </span>
                    <span className="sm:hidden">{waitingParticipants.length}</span>
                  </button>

                  {isWaitingMenuOpen ? (
                    <Card className="absolute right-0 top-full z-30 mt-3 w-[min(26rem,calc(100vw-2rem))] border border-border/80 bg-card/95 p-4 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.38)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-reduce:animate-none">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Waiting to join
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {waitingParticipants.length} request{waitingParticipants.length > 1 ? "s" : ""} pending
                          </p>
                        </div>

                        {waitingParticipants.length > 1 ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="rounded-full border border-primary/25 bg-primary/10 px-3 text-primary hover:bg-primary/20"
                            onClick={handleApproveAllWaitingParticipants}
                          >
                            Admit all
                          </Button>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-3">
                        {waitingParticipants.slice(0, 3).map((participant) => (
                          <div
                            key={participant.participantId}
                            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/45 p-3"
                          >
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary-foreground">
                              {getInitials(participant.name)}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {participant.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Waiting for host approval
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-full bg-primary px-3 text-primary-foreground hover:bg-primary/90"
                                onClick={() => handleApproveWaitingParticipant(participant)}
                              >
                                Admit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => handleRejectWaitingParticipant(participant)}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => {
                            setIsWaitingMenuOpen(false);
                            handlePanelChange("participants");
                          }}
                          className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
                        >
                          View all ({waitingParticipants.length})
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </Card>
                  ) : null}
                </div>
              ) : null}

              <div
                ref={participantsMenuRef}
                className="relative after:absolute after:inset-x-0 after:top-full after:h-3 after:content-['']"
                onMouseEnter={openParticipantsMenu}
                onMouseLeave={scheduleParticipantsMenuClose}
              >
                <button
                  type="button"
                  aria-label="Open participants overview"
                  aria-expanded={isParticipantsMenuOpen}
                  onClick={() => {
                    clearParticipantsMenuCloseTimeout();
                    setIsParticipantsMenuOpen((currentValue) => !currentValue);
                  }}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground shadow-[0_10px_24px_rgba(2,6,23,0.22)] transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                    {participants.length}
                  </span>
                </button>

                {isParticipantsMenuOpen ? (
                  <Card className="absolute right-0 top-full z-30 mt-3 w-[min(22rem,calc(100vw-2rem))] border border-border/80 bg-card/95 p-4 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.38)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-top-2 motion-safe:duration-200 motion-reduce:animate-none">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          Participants
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {participants.length} in the call
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {participants.slice(0, 6).map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/45 px-3 py-2.5"
                        >
                          <UserAvatar
                            avatarUrl={participant.avatarUrl}
                            name={participant.name}
                            email={participant.avatarSource}
                            className="h-10 w-10 bg-primary/20 text-sm"
                            initialsClassName="text-sm"
                          />

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {participant.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {participant.isLocal ? "You" : participant.status}
                            </p>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          setIsParticipantsMenuOpen(false);
                          handlePanelChange("participants");
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
                      >
                        View all participants
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </Card>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {isSidebarRendered && sidebarPanel ? (
          <>
            <button
              type="button"
              aria-label="Close meeting panel"
              className={cn(
                "fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none xl:hidden",
                isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              onClick={() => handlePanelChange(null)}
            />
            <div
              className={cn(
                "fixed inset-x-3 bottom-20 top-16 z-40 flex motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none lg:left-5 lg:right-auto lg:w-96 xl:hidden",
                isSidebarOpen ? "translate-y-0 opacity-100 lg:translate-x-0" : "pointer-events-none translate-y-4 opacity-0 lg:-translate-x-5 lg:translate-y-0",
              )}
            >
              <RoomSidebar
                activePanel={sidebarPanel}
                isOpen={isSidebarOpen}
                participants={participants}
                waitingParticipants={waitingParticipants}
                canManageWaitingRoom={canManageWaitingRoom}
                chatMessages={chatMessages}
                chatDraft={chatDraft}
                isChatReady={isLiveKitEnabled && isRoomConnected}
                isSendingChat={isSendingChat}
                onChatDraftChange={setChatDraft}
                onSendChatMessage={handleSendChatMessage}
                onApproveWaitingParticipant={handleApproveWaitingParticipant}
                onRejectWaitingParticipant={handleRejectWaitingParticipant}
                onApproveAllWaitingParticipants={handleApproveAllWaitingParticipants}
                onKickParticipant={handleKickParticipant}
                onPanelChange={handlePanelChange}
                onClose={() => handlePanelChange(null)}
              />
            </div>
          </>
        ) : null}

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 motion-reduce:transition-none lg:grid lg:grid-rows-[minmax(0,1fr)] lg:p-5 lg:pb-20 lg:pt-18",
            screenShareParticipant
              ? "pb-20 pt-24 sm:pt-20 lg:pb-20 lg:pt-18"
              : "pb-20 pt-16",
            isViewportResizing
              ? "motion-safe:transition-none"
              : "motion-safe:transition-[gap,padding,grid-template-columns] motion-safe:duration-200 motion-safe:ease-out",
            isSidebarOpen
              ? "xl:grid-cols-[24rem_minmax(0,1fr)] xl:gap-x-4"
              : "xl:grid-cols-[0rem_minmax(0,1fr)] xl:gap-x-0",
          )}
        >
          <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col gap-3 motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none xl:col-start-2 xl:row-start-1 xl:order-none">

            {isLiveKitEnabled && !canPlaybackAudio ? (
              <Card className="flex flex-col gap-3 border border-sky-500/30 bg-sky-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-sky-900 dark:text-sky-100">
                  Browser is blocking remote audio. Click once to enable LiveKit audio playback.
                </p>
                <Button type="button" variant="secondary" onClick={handleStartAudio}>
                  Enable audio
                </Button>
              </Card>
            ) : null}

            <div className="min-h-0 flex-1">
              <RoomStage
                participants={participants}
                screenShareParticipant={screenShareParticipant}
                isPageVisible={isPageVisible}
                isLayoutMotionEnabled={!isSidebarLayoutTransitioning && !isViewportResizing}
                isViewportResizing={isViewportResizing}
              />
            </div>
          </div>

          <div
            className={cn(
              "order-2 hidden min-h-0 shrink-0 overflow-hidden motion-safe:transition-[opacity,transform,margin] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none xl:col-start-1 xl:row-start-1 xl:order-none xl:mt-2 xl:flex xl:h-[calc(100%-0.5rem)]",
              isSidebarOpen
                ? "xl:translate-x-0 xl:opacity-100"
                : "pointer-events-none xl:-translate-x-3 xl:opacity-0",
            )}
          >
            {sidebarPanel ? (
              <RoomSidebar
                activePanel={sidebarPanel}
                isOpen={isSidebarOpen}
                participants={participants}
                waitingParticipants={waitingParticipants}
                canManageWaitingRoom={canManageWaitingRoom}
                chatMessages={chatMessages}
                chatDraft={chatDraft}
                isChatReady={isLiveKitEnabled && isRoomConnected}
                isSendingChat={isSendingChat}
                onChatDraftChange={setChatDraft}
                onSendChatMessage={handleSendChatMessage}
                onApproveWaitingParticipant={handleApproveWaitingParticipant}
                onRejectWaitingParticipant={handleRejectWaitingParticipant}
                onApproveAllWaitingParticipants={handleApproveAllWaitingParticipants}
                onKickParticipant={handleKickParticipant}
                onPanelChange={handlePanelChange}
                onClose={() => handlePanelChange(null)}
              />
            ) : null}
          </div>
        </div>

        <RoomFooter
          meetingCode={meetingCode}
          participantsCount={participants.length}
          unreadChatCount={unreadChatCount}
          activePanel={activePanel}
          isMicEnabled={isMicEnabled}
          isCameraEnabled={isCameraEnabled}
          isScreenSharing={isScreenSharing}
          isHandRaised={participants.some((participant) => participant.isLocal && participant.handRaised)}
          isHandRaiseCoolingDown={isHandRaiseCoolingDown}
          microphoneDevices={microphoneDevices}
          cameraDevices={cameraDevices}
          activeMicrophoneId={activeMicrophoneId}
          activeCameraId={activeCameraId}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleScreenShare}
          onToggleHandRaise={handleToggleHandRaise}
          onPresentOtherContent={handlePresentOtherContent}
          onSelectMicrophone={handleSelectMicrophone}
          onSelectCamera={handleSelectCamera}
          onRefreshDevices={() => {
            void syncAvailableDevices();
          }}
          onTogglePanel={togglePanel}
          isHost={canManageWaitingRoom}
          isEndingMeeting={isEndingMeeting}
          onEndMeeting={handleEndMeeting}
          onLeave={handleLeaveMeeting}
        />
      </div>
    </div>
  );
}
