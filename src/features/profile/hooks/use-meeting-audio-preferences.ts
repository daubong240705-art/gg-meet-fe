/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  addMeetingAudioPreferencesChangeListener,
  getDefaultMeetingAudioPreferences,
  getMeetingAudioPreferences,
  playMeetingAudioPreview,
  setMeetingAudioPreference,
  type MeetingAudioKey,
  type MeetingAudioPreferences,
  type MeetingAudioSoundId,
} from "@/lib/meeting/lobby-audio";

export function useMeetingAudioPreferences() {
  const [activeAudioMenuKey, setActiveAudioMenuKey] = useState<MeetingAudioKey | null>(null);
  const [audioPreferences, setAudioPreferences] = useState<MeetingAudioPreferences>(
    () => getDefaultMeetingAudioPreferences(),
  );

  useEffect(() => {
    setAudioPreferences(getMeetingAudioPreferences());

    return addMeetingAudioPreferencesChangeListener(() => {
      setAudioPreferences(getMeetingAudioPreferences());
    });
  }, []);

  const updateAudioPreference = useCallback((
    audioKey: MeetingAudioKey,
    soundId: MeetingAudioSoundId,
  ) => {
    setAudioPreferences((currentPreferences) => ({
      ...currentPreferences,
      [audioKey]: soundId,
    }));
    setMeetingAudioPreference(audioKey, soundId);
    setActiveAudioMenuKey(null);
  }, []);

  const previewAudioPreference = useCallback((
    audioKey: MeetingAudioKey,
    soundId: MeetingAudioSoundId,
  ) => {
    playMeetingAudioPreview(audioKey, soundId);
  }, []);

  return {
    audioPreferences,
    activeAudioMenuKey,
    setActiveAudioMenuKey,
    updateAudioPreference,
    previewAudioPreference,
  };
}
