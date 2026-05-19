"use client";

import { useCallback, useEffect, useState } from "react";
import {
  type ChatMessage as LiveKitChatMessage,
  Participant as LiveKitParticipant,
  Room as LiveKitRoom,
  type RoomOptions,
} from "livekit-client";

import { ensureMeetingAudioReady } from "@/lib/meeting/lobby-audio";
import { useLiveKitRoom } from "@/features/livekit/hooks";

type UseRoomLiveKitSessionParams = {
  roomRef: { current: LiveKitRoom | null };
  enabled: boolean;
  token?: string | null;
  url: string;
  options: RoomOptions;
  initialCameraEnabled: boolean;
  initialMicrophoneEnabled: boolean;
  initialCameraDeviceId?: string | null;
  initialMicrophoneDeviceId?: string | null;
  onParticipantsChange: (room: LiveKitRoom) => void;
  onLocalMediaStateChange?: (room: LiveKitRoom) => void;
  onLocalAttributesChange: (participant: LiveKitParticipant) => void;
  onChatMessage: (
    message: LiveKitChatMessage,
    participant: LiveKitParticipant | undefined,
    room: LiveKitRoom,
  ) => void;
  onDeviceChange: (room: LiveKitRoom) => void;
  onRoomMetadataChanged?: (metadata: string) => void;
  onError: (message: string | null) => void;
  onReset: () => void;
};

export function useRoomLiveKitSession({
  roomRef,
  enabled,
  token,
  url,
  options,
  initialCameraEnabled,
  initialMicrophoneEnabled,
  initialCameraDeviceId,
  initialMicrophoneDeviceId,
  onParticipantsChange,
  onLocalMediaStateChange,
  onLocalAttributesChange,
  onChatMessage,
  onDeviceChange,
  onRoomMetadataChanged,
  onError,
  onReset,
}: UseRoomLiveKitSessionParams) {
  const [canPlaybackAudio, setCanPlaybackAudio] = useState(true);
  const [isRoomConnected, setIsRoomConnected] = useState(false);

  const handleLiveKitReset = useCallback(() => {
    setIsRoomConnected(false);
    onReset();
  }, [onReset]);

  const handleLiveKitError = useCallback((error: Error | null) => {
    onError(error?.message ?? null);
  }, [onError]);

  useLiveKitRoom({
    enabled,
    token,
    url,
    roomRef,
    options,
    initialCameraEnabled,
    initialMicrophoneEnabled,
    initialCameraDeviceId,
    initialMicrophoneDeviceId,
    onConnectionChange: setIsRoomConnected,
    onAudioPlaybackChange: setCanPlaybackAudio,
    onParticipantsChange,
    onLocalMediaStateChange,
    onLocalAttributesChange,
    onChatMessage,
    onDeviceChange,
    onRoomMetadataChanged,
    onError: handleLiveKitError,
    onReset: handleLiveKitReset,
  });

  useEffect(() => {
    ensureMeetingAudioReady();
  }, []);

  const handleStartAudio = useCallback(() => {
    const room = roomRef.current;

    if (!room) {
      return;
    }

    void room.startAudio().then(() => {
      setCanPlaybackAudio(true);
    }).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to start audio playback.";

      onError(errorMessage);
    });
  }, [onError, roomRef]);

  return {
    canPlaybackAudio,
    isRoomConnected,
    handleStartAudio,
  };
}
