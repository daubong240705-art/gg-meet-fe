"use client";

import { useCallback, useRef, useState } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import { toast } from "sonner";

import { meetingApi } from "@/shared/services/meeting.service";
import type { RoomSettings, UpdateRoomSettingsRequest } from "@/shared/services/meeting/types";

const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  allowParticipantUnmute: true,
  allowParticipantShareScreen: true,
};

function parseRoomSettingsMetadata(metadata: string | undefined | null): RoomSettings {
  if (!metadata?.trim()) {
    return { ...DEFAULT_ROOM_SETTINGS };
  }

  try {
    const parsed = JSON.parse(metadata) as Record<string, unknown>;

    return {
      allowParticipantUnmute:
        typeof parsed.allowParticipantUnmute === "boolean"
          ? parsed.allowParticipantUnmute
          : DEFAULT_ROOM_SETTINGS.allowParticipantUnmute,
      allowParticipantShareScreen:
        typeof parsed.allowParticipantShareScreen === "boolean"
          ? parsed.allowParticipantShareScreen
          : DEFAULT_ROOM_SETTINGS.allowParticipantShareScreen,
    };
  } catch {
    return { ...DEFAULT_ROOM_SETTINGS };
  }
}

function applyRoomSettingsPatch(
  current: RoomSettings,
  patch: UpdateRoomSettingsRequest,
): RoomSettings {
  return {
    allowParticipantUnmute:
      typeof patch.allowParticipantUnmute === "boolean"
        ? patch.allowParticipantUnmute
        : current.allowParticipantUnmute,
    allowParticipantShareScreen:
      typeof patch.allowParticipantShareScreen === "boolean"
        ? patch.allowParticipantShareScreen
        : current.allowParticipantShareScreen,
  };
}

type UseRoomSettingsParams = {
  roomRef: { current: LiveKitRoom | null };
  meetingCode: string;
  meetingToken?: string | null;
};

export function useRoomSettings({
  roomRef,
  meetingCode,
  meetingToken,
}: UseRoomSettingsParams) {
  const [settings, setSettings] = useState<RoomSettings>({ ...DEFAULT_ROOM_SETTINGS });
  const [updatingFields, setUpdatingFields] = useState<Partial<Record<keyof RoomSettings, boolean>>>({});
  const pendingUpdateRef = useRef<Partial<Record<keyof RoomSettings, boolean>>>({});

  const handleRoomMetadataChanged = useCallback((metadata: string) => {
    const nextSettings = parseRoomSettingsMetadata(metadata);
    setSettings(nextSettings);
    setUpdatingFields((current) => {
      const cleared: Partial<Record<keyof RoomSettings, boolean>> = {};
      for (const key of Object.keys(current) as (keyof RoomSettings)[]) {
        if (pendingUpdateRef.current[key]) {
          pendingUpdateRef.current[key] = false;
          cleared[key] = false;
        } else {
          cleared[key] = current[key];
        }
      }
      return cleared;
    });
  }, []);

  const handleRoomConnected = useCallback(() => {
    const room = roomRef.current;
    if (room) {
      setSettings(parseRoomSettingsMetadata(room.metadata));
    }
  }, [roomRef]);

  const updateSettings = useCallback(async (patch: UpdateRoomSettingsRequest) => {
    const keys = Object.keys(patch) as (keyof RoomSettings)[];

    setUpdatingFields((current) => {
      const next = { ...current };
      for (const key of keys) {
        next[key] = true;
        pendingUpdateRef.current[key] = true;
      }
      return next;
    });

    try {
      await meetingApi.updateRoomSettings(meetingCode, patch, meetingToken);
      setSettings((current) => applyRoomSettingsPatch(current, patch));
      setUpdatingFields((current) => {
        const next = { ...current };
        for (const key of keys) {
          next[key] = false;
          pendingUpdateRef.current[key] = false;
        }
        return next;
      });
    } catch {
      toast.error("Failed to update room settings", {
        description: "Please try again.",
      });
      setUpdatingFields((current) => {
        const next = { ...current };
        for (const key of keys) {
          next[key] = false;
          pendingUpdateRef.current[key] = false;
        }
        return next;
      });
    }
  }, [meetingCode, meetingToken]);

  return {
    settings,
    updatingFields,
    handleRoomMetadataChanged,
    handleRoomConnected,
    updateSettings,
  };
}
