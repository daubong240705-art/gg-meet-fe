"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
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
import { getLiveKitWebsocketUrl } from "@/lib/config/api-url";

import { REMOTE_PARTICIPANTS } from "./constants";
import RoomFooter from "./room-footer";
import RoomSidebar from "./room-sidebar";
import RoomStage from "./room-stage";
import type {
  ChatMessage,
  MeetingRoomProps,
  Participant,
  SidebarPanel,
} from "./types";
import { getParticipantAccentClassName } from "./utils";

const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
};

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

function mapChatMessageToUiMessage(
  message: LiveKitChatMessage,
  participant: LiveKitParticipant | undefined,
  localDisplayName: string,
): ChatMessage {
  const isLocal = participant?.isLocal ?? false;
  const name = isLocal
    ? localDisplayName
    : participant?.name?.trim() || participant?.identity || "Guest";
  const identity = participant?.identity || "unknown";

  return {
    id: message.id,
    identity,
    name,
    isLocal,
    timestamp: message.timestamp,
    time: formatChatTime(message.timestamp),
    message: message.message,
    editTimestamp: message.editTimestamp,
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
  hostId: string | null | undefined,
  hostName: string | null | undefined,
  localRole: string | null,
): Participant {
  const identity = participant.identity || participant.sid || localDisplayName || "participant";
  const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
  const audioPublication = participant.getTrackPublication(Track.Source.Microphone);
  const screenSharePublication = participant.getTrackPublication(Track.Source.ScreenShare);

  return {
    id: identity,
    identity,
    name:
      participant.isLocal
        ? localDisplayName
        : participant.name?.trim() || participant.identity || "Guest",
    isHost: isHostParticipant({
      participant,
      hostId,
      hostName,
      localRole,
    }),
    isLocal: participant.isLocal,
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
  isMicEnabled: boolean,
  isCameraEnabled: boolean,
  isScreenSharing: boolean,
  isHost: boolean,
): Participant {
  return {
    id: "self",
    identity: "self",
    name: displayName,
    isHost,
    isLocal: true,
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

export default function MeetingRoom({
  meetingCode,
  userName,
  isMicOn,
  isCameraOn,
  livekitToken,
  hostId,
  hostName,
  onLeave,
}: MeetingRoomProps) {
  const displayName = userName.trim() || "Guest";
  const liveKitUrl = getLiveKitWebsocketUrl();
  const isLiveKitEnabled = Boolean(livekitToken && liveKitUrl);
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
  const activePanelRef = useRef<SidebarPanel>(null);
  const seenChatMessageIdsRef = useRef<Set<string>>(new Set());
  const [isMicEnabled, setIsMicEnabled] = useState(isMicOn);
  const [isCameraEnabled, setIsCameraEnabled] = useState(isCameraOn);
  const [activePanel, setActivePanel] = useState<SidebarPanel>(null);
  const [mockScreenShareOwnerId, setMockScreenShareOwnerId] = useState<string | null>(null);
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
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [activeScreenShareId, setActiveScreenShareId] = useState<string | null>(null);

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
    activePanelRef.current = activePanel;
  }, [activePanel]);

  useEffect(() => {
    if (activePanel === "chat") {
      setUnreadChatCount(0);
    }
  }, [activePanel]);

  useEffect(() => {
    void syncAvailableDevices();
  }, [syncAvailableDevices]);

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
    const room = new LiveKitRoom(LIVEKIT_ROOM_OPTIONS);
    roomRef.current = room;
    setChatMessages([]);
    setIsRoomConnected(false);
    setUnreadChatCount(0);
    seenChatMessageIdsRef.current = new Set();
    const participantSpeakingListeners = new Map<LiveKitParticipant, () => void>();

    const syncParticipants = () => {
      if (isDisposed) {
        return;
      }

      const nextParticipants = [
        mapParticipantToUiParticipant(
          room.localParticipant,
          displayName,
          resolvedHostId,
          resolvedHostName,
          localRole,
        ),
        ...Array.from(room.remoteParticipants.values()).map((participant) =>
          mapParticipantToUiParticipant(
            participant,
            displayName,
            resolvedHostId,
            resolvedHostName,
            localRole,
          ),
        ),
      ];

      setLiveParticipants(nextParticipants);
    };

    const bindParticipantSpeakingListener = (participant: LiveKitParticipant) => {
      if (participantSpeakingListeners.has(participant)) {
        return;
      }

      const handleSpeakingChange = () => {
        if (isDisposed) {
          return;
        }

        syncParticipants();
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
      toast.error("Media device error", {
        description: error.message,
      });
    };

    const handleChatMessage = (
      message: LiveKitChatMessage,
      participant?: LiveKitParticipant,
    ) => {
      if (isDisposed) {
        return;
      }

      const nextMessage = mapChatMessageToUiMessage(message, participant, displayName);
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
        syncParticipants();
      })
      .on(RoomEvent.Reconnected, () => {
        setIsRoomConnected(true);
        syncParticipants();
      })
      .on(RoomEvent.Disconnected, () => {
        if (isDisposed) {
          return;
        }

        setIsRoomConnected(false);
      })
      .on(RoomEvent.ParticipantConnected, (participant) => {
        bindParticipantSpeakingListener(participant);
        syncParticipants();
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        unbindParticipantSpeakingListener(participant);
        syncParticipants();
      })
      .on(RoomEvent.TrackSubscribed, syncParticipants)
      .on(RoomEvent.TrackUnsubscribed, syncParticipants)
      .on(RoomEvent.TrackMuted, syncParticipants)
      .on(RoomEvent.TrackUnmuted, syncParticipants)
      .on(RoomEvent.LocalTrackPublished, () => {
        syncParticipants();
        void syncAvailableDevices(room);
      })
      .on(RoomEvent.LocalTrackUnpublished, () => {
        syncParticipants();
        void syncAvailableDevices(room);
      })
      .on(RoomEvent.ActiveSpeakersChanged, syncParticipants)
      .on(RoomEvent.ParticipantNameChanged, syncParticipants)
      .on(RoomEvent.MediaDevicesChanged, () => {
        void syncAvailableDevices(room);
      })
      .on(RoomEvent.ConnectionStateChanged, () => {
        if (isDisposed) {
          return;
        }

        syncParticipants();
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
        syncParticipants();
      } catch (error) {
        if (isDisposed) {
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unable to connect to LiveKit.";

        setLiveKitError(errorMessage);
        toast.error("Unable to join LiveKit room", {
          description: errorMessage,
        });
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
      room.removeAllListeners();
      room.disconnect();

      if (roomRef.current === room) {
        roomRef.current = null;
      }
    };
  }, [displayName, isCameraOn, isLiveKitEnabled, isMicOn, liveKitUrl, livekitToken, localRole, resolvedHostId, resolvedHostName, syncAvailableDevices]);

  const fallbackLocalParticipantIsHost =
    localRole === "HOST"
    || (resolvedHostId !== null && localTokenPayload?.sub?.trim() === resolvedHostId)
    || (resolvedHostName !== null && displayName.trim().toLowerCase() === resolvedHostName.toLowerCase());

  const participants = isLiveKitEnabled
    ? liveParticipants.length > 0
      ? liveParticipants
      : [getFallbackLocalParticipant(displayName, isMicEnabled, isCameraEnabled, false, fallbackLocalParticipantIsHost)]
    : [
      getFallbackLocalParticipant(
        displayName,
        isMicEnabled,
        isCameraEnabled,
        Boolean(mockScreenShareOwnerId),
        true,
      ),
      ...REMOTE_PARTICIPANTS,
    ];

  const screenShareParticipants = participants.filter((participant) => participant.isScreenSharing);
  const screenShareParticipant =
    screenShareParticipants.find((participant) => participant.id === activeScreenShareId)
    ?? screenShareParticipants[0]
    ?? null;
  const isScreenSharing = isLiveKitEnabled
    ? participants.some((participant) => participant.isLocal && participant.isScreenSharing)
    : Boolean(mockScreenShareOwnerId);

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

  const togglePanel = (panel: Exclude<SidebarPanel, null>) => {
    startTransition(() => {
      setActivePanel((currentPanel) =>
        currentPanel === panel ? null : panel
      );
    });
  };

  const handlePanelChange = (panel: SidebarPanel) => {
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
        toast.error("Screen sharing unavailable", {
          description: errorMessage,
        });
      });
      return;
    }

    setMockScreenShareOwnerId((currentOwner) => (currentOwner ? null : "self"));
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
        toast.error("Presentation update failed", {
          description: errorMessage,
        });
      });
      return;
    }

    setMockScreenShareOwnerId("self");
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
      toast.error("Microphone update failed", {
        description: errorMessage,
      });
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
      toast.error("Camera update failed", {
        description: errorMessage,
      });
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
      toast.error("Microphone switch failed", {
        description: errorMessage,
      });
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
      toast.error("Camera switch failed", {
        description: errorMessage,
      });
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

      toast.error("Audio playback blocked", {
        description: errorMessage,
      });
    });
  };

  const handleLeaveMeeting = () => {
    roomRef.current?.disconnect();
    onLeave();
  };

  const handleSendChatMessage = () => {
    const nextMessage = chatDraft.trim();

    if (!nextMessage) {
      return;
    }

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      toast.error("Chat unavailable", {
        description: "Connect to the LiveKit room before sending messages.",
      });
      return;
    }

    setIsSendingChat(true);

    void room.localParticipant.sendChatMessage(nextMessage).then(() => {
      setChatDraft("");
    }).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to send chat message.";

      toast.error("Message failed to send", {
        description: errorMessage,
      });
    }).finally(() => {
      setIsSendingChat(false);
    });
  };

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))]">
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row lg:gap-6 lg:p-6">
          <div className="order-1 flex min-h-0 flex-1 flex-col gap-4 lg:order-2">

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
                onSelectScreenShare={setActiveScreenShareId}
                onToggleScreenShare={handleScreenShare}
              />
            </div>
          </div>

          <div className="order-2 min-h-0 lg:order-1 lg:flex lg:h-full">
            <RoomSidebar
              activePanel={activePanel}
              participants={participants}
              chatMessages={chatMessages}
              chatDraft={chatDraft}
              isChatReady={isLiveKitEnabled && isRoomConnected}
              isSendingChat={isSendingChat}
              onChatDraftChange={setChatDraft}
              onSendChatMessage={handleSendChatMessage}
              onPanelChange={handlePanelChange}
            />
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
          microphoneDevices={microphoneDevices}
          cameraDevices={cameraDevices}
          activeMicrophoneId={activeMicrophoneId}
          activeCameraId={activeCameraId}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleScreenShare}
          onPresentOtherContent={handlePresentOtherContent}
          onSelectMicrophone={handleSelectMicrophone}
          onSelectCamera={handleSelectCamera}
          onRefreshDevices={() => {
            void syncAvailableDevices();
          }}
          onTogglePanel={togglePanel}
          onLeave={handleLeaveMeeting}
        />
      </div>
    </div>
  );
}
