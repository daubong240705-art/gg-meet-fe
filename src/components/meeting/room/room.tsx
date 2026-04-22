"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, UserPlus, Users } from "lucide-react";
import {
  type ChatMessage as LiveKitChatMessage,
  Participant as LiveKitParticipant,
  ParticipantEvent,
  Room as LiveKitRoom,
  RoomEvent,
  Track,
  isAudioTrack,
  isVideoTrack,
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
  playHostWaitingRequestSound,
} from "@/lib/meeting/lobby-audio";
import {
  connectMeetingSocket,
  decodeMeetingToken,
  type MeetingSocketMessage,
} from "@/lib/meeting/meeting-websocket";
import { meetingApi, type WaitingRoomRequestData } from "@/service/meeting.service";

import { isStickerKey } from "./chat-stickers";
import RoomFooter from "./room-footer";
import RoomSidebar from "./room-sidebar";
import RoomStage from "./room-stage";
import type {
  ChatMessage,
  MeetingRoomProps,
  OutboundChatMessage,
  Participant,
  SidebarPanel,
  WaitingParticipant,
} from "./types";
import {
  getDefaultParticipantHandState,
  getParticipantAccentClassName,
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

const SIDEBAR_LAYOUT_TRANSITION_MS = 240;
const VIEWPORT_RESIZE_SETTLE_MS = 180;

function getIsDocumentVisible() {
  return typeof document === "undefined" || document.visibilityState === "visible";
}

function normalizeParticipantRole(role?: string | null) {
  const normalizedRole = role?.trim().toUpperCase();
  return normalizedRole || null;
}

function decodeJwtPayload<
  T extends {
    sub?: string;
    metadata?: string;
  },
>(token?: string | null): T | null {
  if (!token) {
    return null;
  }

  const tokenParts = token.split(".");

  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const payload = tokenParts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(tokenParts[1].length / 4) * 4, "=");
    const decodedPayload =
      typeof atob === "function"
        ? atob(payload)
        : Buffer.from(payload, "base64").toString("utf-8");

    return JSON.parse(decodedPayload) as T;
  } catch {
    return null;
  }
}

function getParticipantRoleFromMetadata(metadata?: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    const parsedMetadata = JSON.parse(metadata);

    if (typeof parsedMetadata === "object" && parsedMetadata !== null && "role" in parsedMetadata) {
      return normalizeParticipantRole(String(parsedMetadata.role));
    }
  } catch {
    return normalizeParticipantRole(metadata);
  }

  return null;
}

function getParticipantAvatarFromMetadata(metadata?: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    const parsedMetadata = JSON.parse(metadata);

    if (typeof parsedMetadata !== "object" || parsedMetadata === null || !("avatar" in parsedMetadata)) {
      return null;
    }

    const avatar = String(parsedMetadata.avatar ?? "").trim();
    return avatar || null;
  } catch {
    return null;
  }
}

function isHostParticipant({
  participant,
  hostId,
  hostName,
  localRole,
}: {
  participant: LiveKitParticipant;
  hostId?: string | null;
  hostName?: string | null;
  localRole?: string | null;
}) {
  const participantRole = getParticipantRoleFromMetadata(participant.metadata);

  if (participantRole === "HOST") {
    return true;
  }

  if (participant.isLocal && localRole === "HOST") {
    return true;
  }

  const normalizedHostId = hostId?.trim();
  const normalizedIdentity = participant.identity?.trim();

  if (normalizedHostId && normalizedIdentity && normalizedHostId === normalizedIdentity) {
    return true;
  }

  const normalizedHostName = hostName?.trim().toLowerCase();
  const participantName = (participant.name?.trim() || "").toLowerCase();

  if (normalizedHostName && participantName && normalizedHostName === participantName) {
    return true;
  }

  return false;
}

function formatChatTime(timestamp: number) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

type ParsedChatPayload =
  | {
    type: "text";
    content: string;
  }
  | {
    type: "sticker";
    stickerKey: string;
  };

function parseIncomingChatPayload(rawMessage: string): ParsedChatPayload | null {
  const normalizedMessage = rawMessage.trim();

  if (!normalizedMessage) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(rawMessage) as {
      type?: unknown;
      content?: unknown;
      stickerKey?: unknown;
    };

    if (parsedPayload.type === "text" && typeof parsedPayload.content === "string") {
      const content = parsedPayload.content.trim();

      return content
        ? {
          type: "text",
          content,
        }
        : null;
    }

    if (parsedPayload.type === "sticker" && typeof parsedPayload.stickerKey === "string") {
      return {
        type: "sticker",
        stickerKey: parsedPayload.stickerKey,
      };
    }

    console.warn("Ignoring unsupported chat payload.", parsedPayload);
    return null;
  } catch {
    return {
      type: "text",
      content: rawMessage,
    };
  }
}

function serializeOutgoingChatPayload(payload: OutboundChatMessage) {
  if (payload.type === "text") {
    return JSON.stringify({
      type: "text",
      content: payload.content.trim(),
    });
  }

  return JSON.stringify({
    type: "sticker",
    stickerKey: payload.stickerKey,
  });
}

function mapChatMessageToUiMessage(
  message: LiveKitChatMessage,
  participant: LiveKitParticipant | undefined,
  localDisplayName: string,
  localEmail?: string | null,
  localAvatarUrl?: string | null,
  localIdentity?: string | null,
): ChatMessage | null {
  const parsedPayload = parseIncomingChatPayload(message.message);

  if (!parsedPayload) {
    return null;
  }

  const participantIdentity = participant?.identity || "";
  const isLocal =
    Boolean(participant?.isLocal)
    || Boolean(localIdentity && participantIdentity && participantIdentity === localIdentity);
  const name = isLocal
    ? localDisplayName
    : participant?.name?.trim() || participant?.identity || "Guest";
  const identity = participantIdentity || (isLocal ? localIdentity || "local" : "unknown");
  const avatarSource = isLocal
    ? localEmail?.trim() || identity || name
    : participant?.identity?.trim() || name;
  const avatarUrl = isLocal
    ? localAvatarUrl?.trim() || null
    : getParticipantAvatarFromMetadata(participant?.metadata);

  const baseMessage = {
    id: message.id,
    identity,
    name,
    avatarSource,
    avatarUrl,
    isLocal,
    timestamp: message.timestamp,
    time: formatChatTime(message.timestamp),
    editTimestamp: message.editTimestamp,
  };

  if (parsedPayload.type === "sticker") {
    return {
      ...baseMessage,
      type: "sticker",
      stickerKey: parsedPayload.stickerKey,
    };
  }

  return {
    ...baseMessage,
    type: "text",
    content: parsedPayload.content,
  };
}

function getCameraTrack(participant: LiveKitParticipant): Participant["cameraTrack"] {
  const publication = participant.getTrackPublication(Track.Source.Camera);
  const track = publication?.track;

  return track && isVideoTrack(track) ? track : null;
}

function getAudioTrack(participant: LiveKitParticipant): Participant["audioTrack"] {
  const publication = participant.getTrackPublication(Track.Source.Microphone);
  const track = publication?.track;

  return track && isAudioTrack(track) ? track : null;
}

function getScreenShareTrack(participant: LiveKitParticipant): Participant["screenShareTrack"] {
  const publication = participant.getTrackPublication(Track.Source.ScreenShare);
  const track = publication?.track;

  return track && isVideoTrack(track) ? track : null;
}

function getParticipantStatus(participant: LiveKitParticipant) {
  if (participant.isScreenShareEnabled) {
    return "Presenting";
  }

  if (participant.isLocal) {
    return "You";
  }

  if (participant.isSpeaking) {
    return "Speaking";
  }

  if (participant.isCameraEnabled && participant.isMicrophoneEnabled) {
    return "In room";
  }

  if (participant.isCameraEnabled) {
    return "Camera on";
  }

  if (participant.isMicrophoneEnabled) {
    return "Listening";
  }

  return "Muted";
}

function mapParticipantToUiParticipant(
  participant: LiveKitParticipant,
  localDisplayName: string,
  localEmail: string | null,
  localAvatarUrl: string | null,
  hostId: string | null | undefined,
  hostName: string | null | undefined,
  localRole: string | null,
  localHandState: ParticipantHandState,
  preferLocalHandState: boolean,
): Participant {
  const identity = participant.identity || participant.sid || localDisplayName || "participant";
  const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
  const audioPublication = participant.getTrackPublication(Track.Source.Microphone);
  const screenSharePublication = participant.getTrackPublication(Track.Source.ScreenShare);
  const participantAvatarUrl = participant.isLocal
    ? localAvatarUrl
    : getParticipantAvatarFromMetadata(participant.metadata);
  const handState =
    participant.isLocal && preferLocalHandState
      ? localHandState
      : getParticipantHandState(
        participant.attributes,
        participant.isLocal ? localHandState : getDefaultParticipantHandState(),
      );

  return {
    id: identity,
    identity,
    name:
      participant.isLocal
        ? localDisplayName
        : participant.name?.trim() || participant.identity || "Guest",
    avatarSource: participant.isLocal
      ? localEmail?.trim() || identity
      : participant.identity?.trim() || participant.name?.trim() || identity,
    avatarUrl: participantAvatarUrl,
    isHost: isHostParticipant({
      participant,
      hostId,
      hostName,
      localRole,
    }),
    isLocal: participant.isLocal,
    handRaised: handState.handRaised,
    handRaisedAt: handState.handRaisedAt,
    isMuted: !(audioPublication && !audioPublication.isMuted),
    isCameraOff: !(cameraPublication && !cameraPublication.isMuted),
    isSpeaking: participant.isSpeaking,
    isScreenSharing: Boolean(screenSharePublication),
    accentClassName: getParticipantAccentClassName(identity),
    status: getParticipantStatus(participant),
    cameraTrack: getCameraTrack(participant),
    audioTrack: participant.isLocal ? null : getAudioTrack(participant),
    screenShareTrack: getScreenShareTrack(participant),
  };
}

function getFallbackLocalParticipant(
  displayName: string,
  localEmail: string | null,
  localAvatarUrl: string | null,
  isMicEnabled: boolean,
  isCameraEnabled: boolean,
  isScreenSharing: boolean,
  isHost: boolean,
  handState: ParticipantHandState,
): Participant {
  return {
    id: "self",
    identity: "self",
    name: displayName,
    avatarSource: localEmail?.trim() || displayName,
    avatarUrl: localAvatarUrl,
    isHost,
    isLocal: true,
    handRaised: handState.handRaised,
    handRaisedAt: handState.handRaisedAt,
    isMuted: !isMicEnabled,
    isCameraOff: !isCameraEnabled,
    isSpeaking: isMicEnabled,
    isScreenSharing,
    accentClassName: "from-primary/30 via-primary/10 to-background",
    status: isScreenSharing ? "Presenting" : "You",
    cameraTrack: null,
    audioTrack: null,
    screenShareTrack: null,
  };
}

function getWaitingParticipantName(message: MeetingSocketMessage) {
  return message.targetName?.trim() || "Guest";
}

function mapWaitingRoomRequestToParticipant(request: WaitingRoomRequestData): WaitingParticipant | null {
  const participantId = request.participantId;

  if (typeof participantId !== "number" || !Number.isFinite(participantId)) {
    return null;
  }

  const requestedAtTimestamp = request.requestedAt ? Date.parse(request.requestedAt) : Number.NaN;

  return {
    participantId,
    name: request.name?.trim() || request.email?.trim() || "Guest",
    requestedAt: Number.isFinite(requestedAtTimestamp) ? requestedAtTimestamp : Date.now(),
  };
}

function areParticipantsEqual(currentParticipants: Participant[], nextParticipants: Participant[]) {
  if (currentParticipants.length !== nextParticipants.length) {
    return false;
  }

  return currentParticipants.every((participant, index) => {
    const nextParticipant = nextParticipants[index];

    return participant.id === nextParticipant.id
      && participant.identity === nextParticipant.identity
      && participant.name === nextParticipant.name
      && participant.avatarUrl === nextParticipant.avatarUrl
      && participant.isHost === nextParticipant.isHost
      && participant.isLocal === nextParticipant.isLocal
      && participant.handRaised === nextParticipant.handRaised
      && participant.handRaisedAt === nextParticipant.handRaisedAt
      && participant.isMuted === nextParticipant.isMuted
      && participant.isCameraOff === nextParticipant.isCameraOff
      && participant.isSpeaking === nextParticipant.isSpeaking
      && participant.isScreenSharing === nextParticipant.isScreenSharing
      && participant.accentClassName === nextParticipant.accentClassName
      && participant.status === nextParticipant.status
      && participant.cameraTrack === nextParticipant.cameraTrack
      && participant.audioTrack === nextParticipant.audioTrack
      && participant.screenShareTrack === nextParticipant.screenShareTrack;
  });
}

export default function MeetingRoom({
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
  const meetingSocketRef = useRef<ReturnType<typeof connectMeetingSocket> | null>(null);
  const hostWaitingRequestAudioRef = useRef<HTMLAudioElement | null>(null);
  const activePanelRef = useRef<SidebarPanel>(null);
  const seenChatMessageIdsRef = useRef<Set<string>>(new Set());
  const localHandStateRef = useRef<ParticipantHandState>(getDefaultParticipantHandState());
  const preferLocalHandStateRef = useRef(false);
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
  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeMicrophoneId, setActiveMicrophoneId] = useState("");
  const [activeCameraId, setActiveCameraId] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [isRoomConnected, setIsRoomConnected] = useState(false);
  const [isPageVisible, setIsPageVisible] = useState(() => getIsDocumentVisible());
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [activeScreenShareId, setActiveScreenShareId] = useState<string | null>(null);
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);
  const waitingParticipantsRef = useRef<WaitingParticipant[]>([]);
  const [isWaitingMenuOpen, setIsWaitingMenuOpen] = useState(false);
  const [isParticipantsMenuOpen, setIsParticipantsMenuOpen] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
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

  const exitMeeting = useCallback((reason: "left" | "ended" = "left") => {
    if (hasExitedMeetingRef.current) {
      return;
    }

    hasExitedMeetingRef.current = true;
    setLocalHandState(getDefaultParticipantHandState());
    setPreferLocalHandState(false);
    meetingSocketRef.current?.disconnect();
    meetingSocketRef.current = null;
    roomRef.current?.disconnect();
    onLeave(reason);
  }, [onLeave]);

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

  const syncAvailableDevices = useCallback(async (currentRoom: LiveKitRoom | null = roomRef.current) => {
    const [microphoneResult, cameraResult] = await Promise.allSettled([
      LiveKitRoom.getLocalDevices("audioinput", false),
      LiveKitRoom.getLocalDevices("videoinput", false),
    ]);

    const nextMicrophoneDevices =
      microphoneResult.status === "fulfilled" ? microphoneResult.value : [];
    const nextCameraDevices =
      cameraResult.status === "fulfilled" ? cameraResult.value : [];

    setMicrophoneDevices(nextMicrophoneDevices);
    setCameraDevices(nextCameraDevices);
    setActiveMicrophoneId(
      currentRoom?.getActiveDevice("audioinput") ?? nextMicrophoneDevices[0]?.deviceId ?? "",
    );
    setActiveCameraId(
      currentRoom?.getActiveDevice("videoinput") ?? nextCameraDevices[0]?.deviceId ?? "",
    );
  }, []);

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
  }, []);

  useEffect(() => {
    localHandStateRef.current = localHandState;
  }, [localHandState]);

  useEffect(() => {
    preferLocalHandStateRef.current = preferLocalHandState;
  }, [preferLocalHandState]);

  useEffect(() => {
    waitingParticipantsRef.current = waitingParticipants;
  }, [waitingParticipants]);

  useEffect(() => {
    if (activePanel === "chat") {
      setUnreadChatCount(0);
    }
  }, [activePanel]);

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

  const upsertWaitingParticipant = useCallback((message: MeetingSocketMessage) => {
    const participantId = message.targetParticipantId;

    if (participantId === null || participantId === undefined) {
      return;
    }

    const participantName = getWaitingParticipantName(message);
    const isNewWaitingParticipant = !waitingParticipantsRef.current.some(
      (participant) => participant.participantId === participantId,
    );

    setWaitingParticipants((currentParticipants) => {
      const existingParticipantIndex = currentParticipants.findIndex(
        (participant) => participant.participantId === participantId,
      );

      if (existingParticipantIndex >= 0) {
        const nextParticipants = [...currentParticipants];
        nextParticipants[existingParticipantIndex] = {
          ...nextParticipants[existingParticipantIndex],
          name: participantName,
        };
        return nextParticipants;
      }

      return [
        ...currentParticipants,
        {
          participantId,
          name: participantName,
          requestedAt: Date.now(),
        },
      ];
    });

    if (isNewWaitingParticipant) {
      // toast.info("New join request", {
      //   description: `${participantName} is waiting for your approval.`,
      // });

      const hostWaitingRequestAudio = hostWaitingRequestAudioRef.current;

      if (hostWaitingRequestAudio) {
        hostWaitingRequestAudio.currentTime = 0;
        void hostWaitingRequestAudio.play().catch(() => {
          playHostWaitingRequestSound();
        });
      } else {
        playHostWaitingRequestSound();
      }
    }
  }, []);

  const removeWaitingParticipant = useCallback((participantId?: number | null) => {
    if (participantId === null || participantId === undefined) {
      return;
    }

    setWaitingParticipants((currentParticipants) =>
      currentParticipants.filter((participant) => participant.participantId !== participantId),
    );
  }, []);

  const syncWaitingParticipants = useCallback(async () => {
    if (!canManageWaitingRoom || !meetingToken) {
      setWaitingParticipants([]);
      return;
    }

    const syncStartedAt = Date.now();

    try {
      const response = await meetingApi.getWaitingRoomRequests(meetingCode, meetingToken);
      const verifiedResponse = assertApiSuccess(response);
      const serverWaitingParticipants = (verifiedResponse.data ?? [])
        .map((request) => mapWaitingRoomRequestToParticipant(request))
        .filter((participant): participant is WaitingParticipant => Boolean(participant));

      setWaitingParticipants((currentParticipants) => {
        const mergedParticipants = new Map<number, WaitingParticipant>();

        serverWaitingParticipants.forEach((participant) => {
          mergedParticipants.set(participant.participantId, participant);
        });

        currentParticipants.forEach((participant) => {
          if (
            !mergedParticipants.has(participant.participantId)
            && participant.requestedAt >= syncStartedAt
          ) {
            mergedParticipants.set(participant.participantId, participant);
          }
        });

        return Array.from(mergedParticipants.values()).sort(
          (leftParticipant, rightParticipant) => leftParticipant.requestedAt - rightParticipant.requestedAt,
        );
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to refresh waiting-room requests.";

      setLiveKitError(errorMessage);
    }
  }, [canManageWaitingRoom, meetingCode, meetingToken]);

  const requestWaitingRoomResync = useCallback(() => {
    window.setTimeout(() => {
      void syncWaitingParticipants();
    }, 300);
  }, [syncWaitingParticipants]);

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
      setWaitingParticipants([]);
      return;
    }

    // OLD: host waiting room only accumulated JOIN_REQUEST websocket events, so any request
    // created while the host tab was away disappeared from the UI after rejoin.
    // NEW: fetch the current pending list from the API whenever the host enters/re-enters the room.
    void syncWaitingParticipants();
  }, [canManageWaitingRoom, meetingToken, syncWaitingParticipants]);

  useEffect(() => {
    meetingSocketRef.current?.disconnect();
    meetingSocketRef.current = null;

    if (!meetingToken) {
      setWaitingParticipants([]);
      return;
    }

    if (!canManageWaitingRoom) {
      setWaitingParticipants([]);
    }

    const connection = connectMeetingSocket({
      meetingCode,
      meetingToken,
      subscribeToMeetingTopic: true,
      subscribeToWaitingTopic: canManageWaitingRoom,
      subscribeToParticipantTopic: canManageWaitingRoom,
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
        }
      },
      onError: (error) => {
        setLiveKitError(error.message);
      },
    });

    meetingSocketRef.current = connection;

    return () => {
      connection.disconnect();

      if (meetingSocketRef.current === connection) {
        meetingSocketRef.current = null;
      }
    };
  }, [
    canManageWaitingRoom,
    exitMeeting,
    meetingCode,
    meetingToken,
    removeWaitingParticipant,
    syncWaitingParticipants,
    upsertWaitingParticipant,
  ]);

  useEffect(() => {
    if (!isLiveKitEnabled || !livekitToken) {
      roomRef.current = null;
      setChatMessages([]);
      setIsRoomConnected(false);
      setUnreadChatCount(0);
      seenChatMessageIdsRef.current = new Set();
      return;
    }

    let isDisposed = false;
    let syncParticipantsFrameId: number | null = null;
    const room = new LiveKitRoom(LIVEKIT_ROOM_OPTIONS);
    roomRef.current = room;
    setChatMessages([]);
    setIsRoomConnected(false);
    setUnreadChatCount(0);
    seenChatMessageIdsRef.current = new Set();
    const participantSpeakingListeners = new Map<LiveKitParticipant, () => void>();

    const syncParticipantsNow = () => {
      if (isDisposed) {
        return;
      }

      const nextParticipants = sortParticipantsByRaisedHand([
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
      ]);

      setLiveParticipants((currentParticipants) =>
        areParticipantsEqual(currentParticipants, nextParticipants)
          ? currentParticipants
          : nextParticipants,
      );
    };

    const scheduleSyncParticipants = () => {
      if (isDisposed || syncParticipantsFrameId !== null) {
        return;
      }

      syncParticipantsFrameId = window.requestAnimationFrame(() => {
        syncParticipantsFrameId = null;
        syncParticipantsNow();
      });
    };

    const bindParticipantSpeakingListener = (participant: LiveKitParticipant) => {
      if (participantSpeakingListeners.has(participant)) {
        return;
      }

      const handleSpeakingChange = () => {
        if (isDisposed) {
          return;
        }

        scheduleSyncParticipants();
      };

      participant.on(ParticipantEvent.IsSpeakingChanged, handleSpeakingChange);
      participantSpeakingListeners.set(participant, () => {
        participant.off(ParticipantEvent.IsSpeakingChanged, handleSpeakingChange);
      });
    };

    const unbindParticipantSpeakingListener = (participant: LiveKitParticipant) => {
      participantSpeakingListeners.get(participant)?.();
      participantSpeakingListeners.delete(participant);
    };

    bindParticipantSpeakingListener(room.localParticipant);

    const handleMediaDeviceError = (error: Error) => {
      if (isDisposed) {
        return;
      }

      setLiveKitError(error.message);
    };

    const handleChatMessage = (
      message: LiveKitChatMessage,
      participant?: LiveKitParticipant,
    ) => {
      if (isDisposed) {
        return;
      }

      const nextMessage = mapChatMessageToUiMessage(
        message,
        participant,
        displayName,
        localEmail,
        localAvatarUrl,
        room.localParticipant.identity,
      );

      if (!nextMessage) {
        return;
      }

      const isExistingMessage = seenChatMessageIdsRef.current.has(nextMessage.id);

      if (!isExistingMessage) {
        seenChatMessageIdsRef.current.add(nextMessage.id);

        if (!nextMessage.isLocal && activePanelRef.current !== "chat") {
          setUnreadChatCount((currentCount) => currentCount + 1);
        }
      }

      setChatMessages((currentMessages) => {
        const existingMessageIndex = currentMessages.findIndex(
          (currentMessage) => currentMessage.id === nextMessage.id,
        );

        if (existingMessageIndex >= 0) {
          const updatedMessages = [...currentMessages];
          updatedMessages[existingMessageIndex] = nextMessage;
          return updatedMessages.sort((left, right) => left.timestamp - right.timestamp);
        }

        return [...currentMessages, nextMessage].sort(
          (left, right) => left.timestamp - right.timestamp,
        );
      });
    };

    room
      .on(RoomEvent.Connected, () => {
        setIsRoomConnected(true);
        scheduleSyncParticipants();
      })
      .on(RoomEvent.Reconnected, () => {
        setIsRoomConnected(true);
        scheduleSyncParticipants();
      })
      .on(RoomEvent.Disconnected, () => {
        if (isDisposed) {
          return;
        }

        setIsRoomConnected(false);
      })
      .on(RoomEvent.ParticipantConnected, (participant) => {
        bindParticipantSpeakingListener(participant);
        scheduleSyncParticipants();
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        unbindParticipantSpeakingListener(participant);
        scheduleSyncParticipants();
      })
      .on(RoomEvent.TrackSubscribed, scheduleSyncParticipants)
      .on(RoomEvent.TrackUnsubscribed, scheduleSyncParticipants)
      .on(RoomEvent.TrackMuted, scheduleSyncParticipants)
      .on(RoomEvent.TrackUnmuted, scheduleSyncParticipants)
      .on(RoomEvent.LocalTrackPublished, () => {
        scheduleSyncParticipants();
        void syncAvailableDevices(room);
      })
      .on(RoomEvent.LocalTrackUnpublished, () => {
        scheduleSyncParticipants();
        void syncAvailableDevices(room);
      })
      .on(RoomEvent.ActiveSpeakersChanged, scheduleSyncParticipants)
      .on(RoomEvent.ParticipantAttributesChanged, (_changedAttributes, participant) => {
        if (participant.isLocal) {
          const nextLocalHandState = getParticipantHandState(participant.attributes);
          setLocalHandState(nextLocalHandState);
          setPreferLocalHandState(false);
        }

        scheduleSyncParticipants();
      })
      .on(RoomEvent.ParticipantNameChanged, scheduleSyncParticipants)
      .on(RoomEvent.MediaDevicesChanged, () => {
        void syncAvailableDevices(room);
      })
      .on(RoomEvent.ConnectionStateChanged, () => {
        if (isDisposed) {
          return;
        }

        scheduleSyncParticipants();
      })
      .on(RoomEvent.AudioPlaybackStatusChanged, (playing) => {
        if (isDisposed) {
          return;
        }

        setCanPlaybackAudio(playing);
      })
      .on(RoomEvent.ChatMessage, handleChatMessage)
      .on(RoomEvent.MediaDevicesError, handleMediaDeviceError);

    const connectRoom = async () => {
      try {
        setLiveKitError(null);
        room.prepareConnection(liveKitUrl, livekitToken);
        await room.connect(liveKitUrl, livekitToken);

        if (isDisposed) {
          room.disconnect();
          return;
        }

        bindParticipantSpeakingListener(room.localParticipant);
        Array.from(room.remoteParticipants.values()).forEach(bindParticipantSpeakingListener);
        setCanPlaybackAudio(room.canPlaybackAudio);

        if (isCameraOn && isMicOn) {
          await room.localParticipant.enableCameraAndMicrophone();
        } else {
          if (isCameraOn) {
            await room.localParticipant.setCameraEnabled(true);
          }

          if (isMicOn) {
            await room.localParticipant.setMicrophoneEnabled(true);
          }
        }

        await syncAvailableDevices(room);
        syncParticipantsNow();
      } catch (error) {
        if (isDisposed) {
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unable to connect to LiveKit.";

        setLiveKitError(errorMessage);
      }
    };

    void connectRoom();

    return () => {
      isDisposed = true;
      setIsRoomConnected(false);
      seenChatMessageIdsRef.current = new Set();
      participantSpeakingListeners.forEach((disposeListener) => {
        disposeListener();
      });
      participantSpeakingListeners.clear();
      if (syncParticipantsFrameId !== null) {
        window.cancelAnimationFrame(syncParticipantsFrameId);
      }
      room.removeAllListeners();
      room.disconnect();

      if (roomRef.current === room) {
        roomRef.current = null;
      }
    };
  }, [displayName, isCameraOn, isLiveKitEnabled, isMicOn, liveKitUrl, livekitToken, localAvatarUrl, localEmail, localRole, resolvedHostId, resolvedHostName, syncAvailableDevices]);

  const fallbackLocalParticipantIsHost =
    localRole === "HOST"
    || localMeetingRole === "HOST"
    || (resolvedHostId !== null && localTokenPayload?.sub?.trim() === resolvedHostId)
    || (resolvedHostName !== null && displayName.trim().toLowerCase() === resolvedHostName.toLowerCase());

  const participants = sortParticipantsByRaisedHand(
    isLiveKitEnabled
      ? liveParticipants.length > 0
        ? liveParticipants
        : [getFallbackLocalParticipant(displayName, localEmail, localAvatarUrl, isMicEnabled, isCameraEnabled, false, fallbackLocalParticipantIsHost, localHandState)]
      : [getFallbackLocalParticipant(displayName, localEmail, localAvatarUrl, isMicEnabled, isCameraEnabled, false, fallbackLocalParticipantIsHost, localHandState)],
  );

  const screenShareParticipants = participants.filter((participant) => participant.isScreenSharing);
  const screenShareParticipant =
    screenShareParticipants.find((participant) => participant.id === activeScreenShareId)
    ?? screenShareParticipants[0]
    ?? null;
  const isScreenSharing = isLiveKitEnabled
    ? participants.some((participant) => participant.isLocal && participant.isScreenSharing)
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
    const nextHandRaised = !localHandState.handRaised;
    const nextHandState: ParticipantHandState = {
      handRaised: nextHandRaised,
      handRaisedAt: nextHandRaised ? Date.now() : null,
    };

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

  const handleSelectMicrophone = (deviceId: string) => {
    setActiveMicrophoneId(deviceId);

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      return;
    }

    void room.switchActiveDevice("audioinput", deviceId).then(() => {
      void syncAvailableDevices(room);
    }).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to switch microphone.";

      void syncAvailableDevices(room);
      setLiveKitError(errorMessage);
    });
  };

  const handleSelectCamera = (deviceId: string) => {
    setActiveCameraId(deviceId);

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      return;
    }

    void room.switchActiveDevice("videoinput", deviceId).then(() => {
      void syncAvailableDevices(room);
    }).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to switch camera.";

      void syncAvailableDevices(room);
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
      meetingSocketRef.current?.sendAccept({
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
  }, [meetingCode, removeWaitingParticipant, requestWaitingRoomResync]);

  const handleRejectWaitingParticipant = useCallback((participant: WaitingParticipant) => {
    try {
      meetingSocketRef.current?.sendReject({
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
  }, [meetingCode, removeWaitingParticipant, requestWaitingRoomResync]);

  const handleApproveAllWaitingParticipants = useCallback(() => {
    let hasQueuedResync = false;

    waitingParticipants.forEach((participant) => {
      try {
        meetingSocketRef.current?.sendAccept({
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
  }, [meetingCode, removeWaitingParticipant, requestWaitingRoomResync, waitingParticipants]);

  const handleSendChatMessage = (payload: OutboundChatMessage) => {
    if (payload.type === "text" && !payload.content.trim()) {
      return;
    }

    if (payload.type === "sticker" && !isStickerKey(payload.stickerKey)) {
      return;
    }

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      setLiveKitError("Connect to the LiveKit room before sending messages.");
      return;
    }

    setIsSendingChat(true);

    void room.localParticipant.sendChatMessage(serializeOutgoingChatPayload(payload)).then(() => {
      if (payload.type === "text") {
        setChatDraft("");
      }
    }).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to send chat message.";

      setLiveKitError(errorMessage);
    }).finally(() => {
      setIsSendingChat(false);
    });
  };

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
        <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-4 pt-4 lg:px-6 lg:pt-6">
          <div className="pointer-events-auto flex items-start justify-between gap-3">
            <div className="min-w-0 max-w-[min(24rem,calc(100vw-7rem))] px-1 py-1">
              <p className="truncate text-lg font-semibold text-white/95">
                {meetingTitle}
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-primary/25 bg-primary/15 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 sm:px-4"
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
                  className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border/80 bg-card/95 text-foreground shadow-[0_12px_30px_rgba(2,6,23,0.24)] transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Users className="h-4 w-4" />
                  </div>
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[11px] font-semibold text-background">
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
                "fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none lg:hidden",
                isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              onClick={() => handlePanelChange(null)}
            />
            <div
              className={cn(
                "fixed inset-x-3 bottom-24 top-24 z-40 flex motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none lg:hidden",
                isSidebarOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
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
                onPanelChange={handlePanelChange}
                onClose={() => handlePanelChange(null)}
              />
            </div>
          </>
        ) : null}

        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-24 motion-reduce:transition-none lg:grid lg:grid-rows-[minmax(0,1fr)] lg:p-6 lg:pt-24",
            isViewportResizing
              ? "motion-safe:transition-none"
              : "motion-safe:transition-[gap,padding,grid-template-columns] motion-safe:duration-200 motion-safe:ease-out",
            isSidebarOpen
              ? "lg:grid-cols-[24rem_minmax(0,1fr)] lg:gap-x-6"
              : "lg:grid-cols-[0rem_minmax(0,1fr)] lg:gap-x-0",
          )}
        >
          <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col gap-4 motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none lg:col-start-2 lg:row-start-1 lg:order-none">

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
                screenShareParticipants={screenShareParticipants}
                screenShareParticipant={screenShareParticipant}
                isLocalScreenSharing={isScreenSharing}
                isPageVisible={isPageVisible}
                isLayoutMotionEnabled={!isSidebarLayoutTransitioning && !isViewportResizing}
                isViewportResizing={isViewportResizing}
                onSelectScreenShare={setActiveScreenShareId}
                onToggleScreenShare={handleScreenShare}
              />
            </div>
          </div>

          <div
            className={cn(
              "order-2 hidden min-h-0 shrink-0 overflow-hidden motion-safe:transition-[opacity,transform,margin] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none lg:col-start-1 lg:row-start-1 lg:order-none lg:mt-2 lg:flex lg:h-[calc(100%-0.5rem)]",
              isSidebarOpen
                ? "lg:translate-x-0 lg:opacity-100"
                : "pointer-events-none lg:-translate-x-3 lg:opacity-0",
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
