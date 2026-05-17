/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addMeetingDevicePreferencesChangeListener,
  getDefaultMeetingDevicePreferences,
  getMeetingDevicePreferences,
  setMeetingDevicePreference,
  type MeetingDevicePreferenceKey,
  type MeetingDevicePreferences,
} from "@/lib/meeting/device-preferences";

import type { DeviceMenuKey } from "../types";

export function getDeviceLabel(
  devices: MediaDeviceInfo[],
  selectedDeviceId: string,
  fallbackPrefix: string,
) {
  if (!selectedDeviceId) {
    return "System default";
  }

  const selectedDeviceIndex = devices.findIndex((device) => device.deviceId === selectedDeviceId);
  const selectedDevice = selectedDeviceIndex >= 0 ? devices[selectedDeviceIndex] : null;

  return selectedDevice?.label || `${fallbackPrefix} ${selectedDeviceIndex >= 0 ? selectedDeviceIndex + 1 : ""}`.trim();
}

export function useMeetingDevicePreferences() {
  const [activeDeviceMenuKey, setActiveDeviceMenuKey] = useState<DeviceMenuKey>(null);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [microphoneDevices, setMicrophoneDevices] = useState<MediaDeviceInfo[]>([]);
  const [devicePreferences, setDevicePreferences] = useState<MeetingDevicePreferences>(
    () => getDefaultMeetingDevicePreferences(),
  );

  useEffect(() => {
    setDevicePreferences(getMeetingDevicePreferences());

    return addMeetingDevicePreferencesChangeListener(() => {
      setDevicePreferences(getMeetingDevicePreferences());
    });
  }, []);

  useEffect(() => {
    let isDisposed = false;

    async function loadMeetingDevices() {
      if (!navigator.mediaDevices?.enumerateDevices) {
        return;
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();

        if (isDisposed) {
          return;
        }

        setCameraDevices(devices.filter((device) => device.kind === "videoinput"));
        setMicrophoneDevices(devices.filter((device) => device.kind === "audioinput"));
      } catch {
        if (!isDisposed) {
          setCameraDevices([]);
          setMicrophoneDevices([]);
        }
      }
    }

    void loadMeetingDevices();

    return () => {
      isDisposed = true;
    };
  }, []);

  const updateDevicePreference = useCallback(<K extends MeetingDevicePreferenceKey>(
    key: K,
    value: MeetingDevicePreferences[K],
  ) => {
    setDevicePreferences((currentPreferences) => ({
      ...currentPreferences,
      [key]: value,
    }));
    setMeetingDevicePreference(key, value);
  }, []);

  const selectMeetingDevice = useCallback((
    key: "defaultCameraDeviceId" | "defaultMicrophoneDeviceId",
    deviceId: string,
  ) => {
    updateDevicePreference(key, deviceId);
    setActiveDeviceMenuKey(null);
  }, [updateDevicePreference]);

  return {
    devicePreferences,
    cameraDevices,
    microphoneDevices,
    activeDeviceMenuKey,
    setActiveDeviceMenuKey,
    updateDevicePreference,
    selectMeetingDevice,
  };
}
