"use client";

import { useCallback, useState } from "react";
import { Room as LiveKitRoom } from "livekit-client";

type UseRoomMediaControlsParams = {
  roomRef: { current: LiveKitRoom | null };
  isLiveKitEnabled: boolean;
  initialMicrophoneEnabled: boolean;
  initialCameraEnabled: boolean;
  onError: (message: string) => void;
};

export function useRoomMediaControls({
  roomRef,
  isLiveKitEnabled,
  initialMicrophoneEnabled,
  initialCameraEnabled,
  onError,
}: UseRoomMediaControlsParams) {
  const [isMicEnabled, setIsMicEnabled] = useState(initialMicrophoneEnabled);
  const [isCameraEnabled, setIsCameraEnabled] = useState(initialCameraEnabled);

  const handleToggleMic = useCallback(() => {
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
      onError(errorMessage);
    });
  }, [isLiveKitEnabled, isMicEnabled, onError, roomRef]);

  const handleToggleCamera = useCallback(() => {
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
      onError(errorMessage);
    });
  }, [isCameraEnabled, isLiveKitEnabled, onError, roomRef]);

  return {
    isMicEnabled,
    isCameraEnabled,
    handleToggleMic,
    handleToggleCamera,
  };
}
