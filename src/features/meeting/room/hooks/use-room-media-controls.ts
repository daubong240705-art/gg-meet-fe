"use client";

import { useCallback, useRef, useState } from "react";
import { Room as LiveKitRoom, Track } from "livekit-client";
import { toast } from "sonner";

type UseRoomMediaControlsParams = {
  roomRef: { current: LiveKitRoom | null };
  isLiveKitEnabled: boolean;
  initialMicrophoneEnabled: boolean;
  initialCameraEnabled: boolean;
  canUnmuteMicrophone: boolean;
  onError: (message: string) => void;
};

export function useRoomMediaControls({
  roomRef,
  isLiveKitEnabled,
  initialMicrophoneEnabled,
  initialCameraEnabled,
  canUnmuteMicrophone,
  onError,
}: UseRoomMediaControlsParams) {
  const [isMicEnabled, setIsMicEnabled] = useState(initialMicrophoneEnabled);
  const [isCameraEnabled, setIsCameraEnabled] = useState(initialCameraEnabled);
  const isMicEnabledRef = useRef(initialMicrophoneEnabled);
  const isCameraEnabledRef = useRef(initialCameraEnabled);
  const hasSyncedLocalMediaRef = useRef(false);
  const pendingLocalAudioMuteRef = useRef(false);
  const pendingLocalVideoMuteRef = useRef(false);

  const updateMicEnabled = useCallback((isEnabled: boolean) => {
    isMicEnabledRef.current = isEnabled;
    setIsMicEnabled(isEnabled);
  }, []);

  const updateCameraEnabled = useCallback((isEnabled: boolean) => {
    isCameraEnabledRef.current = isEnabled;
    setIsCameraEnabled(isEnabled);
  }, []);

  const syncLocalMediaState = useCallback((room?: LiveKitRoom | null) => {
    const currentRoom = room ?? roomRef.current;

    if (!currentRoom || !isLiveKitEnabled) {
      return;
    }

    const microphonePublication = currentRoom.localParticipant.getTrackPublication(
      Track.Source.Microphone,
    );
    const cameraPublication = currentRoom.localParticipant.getTrackPublication(
      Track.Source.Camera,
    );
    const nextMicEnabled = Boolean(microphonePublication && !microphonePublication.isMuted);
    const nextCameraEnabled = Boolean(cameraPublication && !cameraPublication.isMuted);

    if (!hasSyncedLocalMediaRef.current) {
      hasSyncedLocalMediaRef.current = true;
      updateMicEnabled(nextMicEnabled);
      updateCameraEnabled(nextCameraEnabled);
      return;
    }

    if (isMicEnabledRef.current && !nextMicEnabled) {
      if (pendingLocalAudioMuteRef.current) {
        pendingLocalAudioMuteRef.current = false;
      } else {
        toast("Microphone muted", {
          description: "Host muted your microphone.",
        });
      }
    }

    if (isCameraEnabledRef.current && !nextCameraEnabled) {
      if (pendingLocalVideoMuteRef.current) {
        pendingLocalVideoMuteRef.current = false;
      } else {
        toast("Camera turned off", {
          description: "Host turned off your camera.",
        });
      }
    }

    updateMicEnabled(nextMicEnabled);
    updateCameraEnabled(nextCameraEnabled);
  }, [isLiveKitEnabled, roomRef, updateCameraEnabled, updateMicEnabled]);

  const handleToggleMic = useCallback(() => {
    const nextValue = !isMicEnabled;

    if (nextValue && !canUnmuteMicrophone) {
      toast("Microphone locked", {
        description: "The host has disabled participants from unmuting.",
      });
      return;
    }

    pendingLocalAudioMuteRef.current = !nextValue;
    updateMicEnabled(nextValue);

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      return;
    }

    void room.localParticipant.setMicrophoneEnabled(nextValue).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to update microphone.";

      pendingLocalAudioMuteRef.current = false;
      updateMicEnabled(!nextValue);
      onError(errorMessage);
    });
  }, [
    canUnmuteMicrophone,
    isLiveKitEnabled,
    isMicEnabled,
    onError,
    roomRef,
    updateMicEnabled,
  ]);

  const handleToggleCamera = useCallback(() => {
    const nextValue = !isCameraEnabled;
    pendingLocalVideoMuteRef.current = !nextValue;
    updateCameraEnabled(nextValue);

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      return;
    }

    void room.localParticipant.setCameraEnabled(nextValue).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to update camera.";

      pendingLocalVideoMuteRef.current = false;
      updateCameraEnabled(!nextValue);
      onError(errorMessage);
    });
  }, [isCameraEnabled, isLiveKitEnabled, onError, roomRef, updateCameraEnabled]);

  return {
    isMicEnabled,
    isCameraEnabled,
    handleToggleMic,
    handleToggleCamera,
    syncLocalMediaState,
  };
}
