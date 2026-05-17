"use client";

import { useCallback, useState } from "react";
import { Room as LiveKitRoom } from "livekit-client";

import {
  rememberMeetingCameraDevice,
  rememberMeetingMicrophoneDevice,
} from "@/lib/meeting/device-preferences";

type UseRoomDevicesParams = {
  roomRef: { current: LiveKitRoom | null };
  isLiveKitEnabled: boolean;
  onError: (message: string) => void;
};

export function useRoomDevices({
  roomRef,
  isLiveKitEnabled,
  onError,
}: UseRoomDevicesParams) {
  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeMicrophoneId, setActiveMicrophoneId] = useState("");
  const [activeCameraId, setActiveCameraId] = useState("");

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
  }, [roomRef]);

  const handleSelectMicrophone = useCallback((deviceId: string) => {
    setActiveMicrophoneId(deviceId);
    rememberMeetingMicrophoneDevice(deviceId);

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
      onError(errorMessage);
    });
  }, [isLiveKitEnabled, onError, roomRef, syncAvailableDevices]);

  const handleSelectCamera = useCallback((deviceId: string) => {
    setActiveCameraId(deviceId);
    rememberMeetingCameraDevice(deviceId);

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
      onError(errorMessage);
    });
  }, [isLiveKitEnabled, onError, roomRef, syncAvailableDevices]);

  return {
    microphoneDevices,
    cameraDevices,
    activeMicrophoneId,
    activeCameraId,
    syncAvailableDevices,
    handleSelectMicrophone,
    handleSelectCamera,
  };
}
