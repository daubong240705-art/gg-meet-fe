"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  Participant as LiveKitParticipant,
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
import RoomHeader from "./room-header";
import RoomSidebar from "./room-sidebar";
import RoomStage from "./room-stage";
import type { MeetingRoomProps, Participant, SidebarPanel, ViewMode } from "./types";
import { getParticipantAccentClassName } from "./utils";

const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
};

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
  localIdentity: string,
  localDisplayName: string,
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
    isHost: identity === localIdentity,
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
): Participant {
  return {
    id: "self",
    identity: "self",
    name: displayName,
    isHost: true,
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
  onLeave,
}: MeetingRoomProps) {
  const displayName = userName.trim() || "Guest";
  const liveKitUrl = getLiveKitWebsocketUrl();
  const isLiveKitEnabled = Boolean(livekitToken && liveKitUrl);
  const roomRef = useRef<LiveKitRoom | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState(isMicOn);
  const [isCameraEnabled, setIsCameraEnabled] = useState(isCameraOn);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activePanel, setActivePanel] = useState<SidebarPanel>(null);
  const [mockScreenShareOwnerId, setMockScreenShareOwnerId] = useState<string | null>(null);
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    isLiveKitEnabled ? ConnectionState.Connecting : ConnectionState.Connected,
  );
  const [liveKitError, setLiveKitError] = useState<string | null>(null);
  const [canPlaybackAudio, setCanPlaybackAudio] = useState(true);

  useEffect(() => {
    if (!isLiveKitEnabled || !livekitToken) {
      roomRef.current = null;
      return;
    }

    let isDisposed = false;
    const room = new LiveKitRoom(LIVEKIT_ROOM_OPTIONS);
    roomRef.current = room;

    const syncParticipants = () => {
      if (isDisposed) {
        return;
      }

      const nextParticipants = [
        mapParticipantToUiParticipant(
          room.localParticipant,
          room.localParticipant.identity,
          displayName,
        ),
        ...Array.from(room.remoteParticipants.values()).map((participant) =>
          mapParticipantToUiParticipant(
            participant,
            room.localParticipant.identity,
            displayName,
          ),
        ),
      ];

      setLiveParticipants(nextParticipants);
    };

    const handleMediaDeviceError = (error: Error) => {
      if (isDisposed) {
        return;
      }

      setLiveKitError(error.message);
      toast.error("Media device error", {
        description: error.message,
      });
    };

    room
      .on(RoomEvent.Connected, syncParticipants)
      .on(RoomEvent.Reconnected, syncParticipants)
      .on(RoomEvent.ParticipantConnected, syncParticipants)
      .on(RoomEvent.ParticipantDisconnected, syncParticipants)
      .on(RoomEvent.TrackSubscribed, syncParticipants)
      .on(RoomEvent.TrackUnsubscribed, syncParticipants)
      .on(RoomEvent.TrackMuted, syncParticipants)
      .on(RoomEvent.TrackUnmuted, syncParticipants)
      .on(RoomEvent.LocalTrackPublished, syncParticipants)
      .on(RoomEvent.LocalTrackUnpublished, syncParticipants)
      .on(RoomEvent.ActiveSpeakersChanged, syncParticipants)
      .on(RoomEvent.ParticipantNameChanged, syncParticipants)
      .on(RoomEvent.ConnectionStateChanged, (state) => {
        if (isDisposed) {
          return;
        }

        startTransition(() => {
          setConnectionState(state);
        });
        syncParticipants();
      })
      .on(RoomEvent.AudioPlaybackStatusChanged, (playing) => {
        if (isDisposed) {
          return;
        }

        setCanPlaybackAudio(playing);
      })
      .on(RoomEvent.MediaDevicesError, handleMediaDeviceError);

    const connectRoom = async () => {
      try {
        setConnectionState(ConnectionState.Connecting);
        setLiveKitError(null);
        room.prepareConnection(liveKitUrl, livekitToken);
        await room.connect(liveKitUrl, livekitToken);

        if (isDisposed) {
          room.disconnect();
          return;
        }

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

        syncParticipants();
      } catch (error) {
        if (isDisposed) {
          return;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unable to connect to LiveKit.";

        setConnectionState(ConnectionState.Disconnected);
        setLiveKitError(errorMessage);
        toast.error("Unable to join LiveKit room", {
          description: errorMessage,
        });
      }
    };

    void connectRoom();

    return () => {
      isDisposed = true;
      room.removeAllListeners();
      room.disconnect();

      if (roomRef.current === room) {
        roomRef.current = null;
      }
    };
  }, [displayName, isCameraOn, isLiveKitEnabled, isMicOn, liveKitUrl, livekitToken]);

  const participants = isLiveKitEnabled
    ? liveParticipants.length > 0
      ? liveParticipants
      : [getFallbackLocalParticipant(displayName, isMicEnabled, isCameraEnabled, false)]
    : [
      getFallbackLocalParticipant(
        displayName,
        isMicEnabled,
        isCameraEnabled,
        Boolean(mockScreenShareOwnerId),
      ),
      ...REMOTE_PARTICIPANTS,
    ];

  const screenShareParticipant = isLiveKitEnabled
    ? participants.find((participant) => participant.isScreenSharing) ?? null
    : participants.find((participant) => participant.id === mockScreenShareOwnerId) ?? null;
  const isScreenSharing = isLiveKitEnabled
    ? participants.some((participant) => participant.isLocal && participant.isScreenSharing)
    : Boolean(mockScreenShareOwnerId);
  const roomStatusLabel = liveKitError
    ? "LiveKit issue"
    : !isLiveKitEnabled
      ? "Room live"
      : connectionState === ConnectionState.Connected
        ? "LiveKit connected"
        : connectionState === ConnectionState.Reconnecting ||
            connectionState === ConnectionState.SignalReconnecting
          ? "Reconnecting to LiveKit"
          : connectionState === ConnectionState.Connecting
            ? "Connecting to LiveKit"
            : "LiveKit disconnected";

  const handleViewModeChange = (nextViewMode: ViewMode) => {
    startTransition(() => {
      setViewMode(nextViewMode);
    });
  };

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

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))]">
        <RoomHeader
          meetingCode={meetingCode}
          viewMode={viewMode}
          isRoomLive={!isLiveKitEnabled || connectionState === ConnectionState.Connected}
          statusLabel={roomStatusLabel}
          onViewModeChange={handleViewModeChange}
        />

        <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row lg:p-6">
          <div className="flex min-h-0 flex-1 flex-col gap-4">
            {liveKitError ? (
              <Card className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
                {liveKitError}
              </Card>
            ) : null}

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
              viewMode={viewMode}
              screenShareParticipant={screenShareParticipant}
              onToggleScreenShare={handleScreenShare}
            />
            </div>
          </div>

          <RoomSidebar
            activePanel={activePanel}
            participants={participants}
            onPanelChange={handlePanelChange}
          />
        </div>

        <RoomFooter
          displayName={displayName}
          participantsCount={participants.length}
          activePanel={activePanel}
          isMicEnabled={isMicEnabled}
          isCameraEnabled={isCameraEnabled}
          isScreenSharing={isScreenSharing}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleScreenShare}
          onTogglePanel={togglePanel}
          onLeave={handleLeaveMeeting}
        />
      </div>
    </div>
  );
}
