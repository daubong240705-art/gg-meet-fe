"use client";

import { useEffect, useRef, useState } from "react";

import { MEETING_AUDIO_CAPTURE_DEFAULTS } from "@/lib/meeting/audio-capture";
import {
  rememberMeetingCameraDevice,
  rememberMeetingMicrophoneDevice,
} from "@/lib/meeting/device-preferences";

export type LobbyDeviceMenuKey =
  | "selector-camera"
  | "selector-mic"
  | null;

type UseLobbyDevicesParams = {
  initialIsCameraOn: boolean;
  initialIsMicOn: boolean;
  initialCameraDeviceId?: string;
  initialMicrophoneDeviceId?: string;
};

export function useLobbyDevices({
  initialIsCameraOn,
  initialIsMicOn,
  initialCameraDeviceId = "",
  initialMicrophoneDeviceId = "",
}: UseLobbyDevicesParams) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(initialIsCameraOn);
  const [isMicOn, setIsMicOn] = useState(initialIsMicOn);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCameraState] = useState(initialCameraDeviceId);
  const [selectedMic, setSelectedMicState] = useState(initialMicrophoneDeviceId);
  const [openMenu, setOpenMenu] = useState<LobbyDeviceMenuKey>(null);
  const [deviceError, setDeviceError] = useState("");

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
    setSelectedCameraState((current) => (
      current && cameras.some((device) => device.deviceId === current)
        ? current
        : cameras[0]?.deviceId || ""
    ));
    setSelectedMicState((current) => (
      current && microphones.some((device) => device.deviceId === current)
        ? current
        : microphones[0]?.deviceId || ""
    ));
  }

  function setSelectedCamera(deviceId: string) {
    setSelectedCameraState(deviceId);
    rememberMeetingCameraDevice(deviceId);
  }

  function setSelectedMic(deviceId: string) {
    setSelectedMicState(deviceId);
    rememberMeetingMicrophoneDevice(deviceId);
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
        await loadDevices();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isCameraOn ? { deviceId: selectedCamera || undefined } : false,
          audio: isMicOn
            ? { deviceId: selectedMic || undefined, ...MEETING_AUDIO_CAPTURE_DEFAULTS }
            : false,
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

  return {
    videoRef,
    isCameraOn,
    isMicOn,
    videoDevices,
    audioDevices,
    selectedCamera,
    selectedMic,
    openMenu,
    deviceError,
    setIsCameraOn,
    setIsMicOn,
    setSelectedCamera,
    setSelectedMic,
    setOpenMenu,
  };
}
