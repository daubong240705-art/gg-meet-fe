import type { MeetingAudioKey, MeetingAudioPreferences, MeetingAudioSoundId } from "./audio-options";
import { VALID_MEETING_AUDIO_SOUND_IDS } from "./audio-options";

const MEETING_AUDIO_PREFERENCES_STORAGE_KEY = "gg-meet:meeting-audio-preferences:v1";
const MEETING_AUDIO_PREFERENCES_CHANGE_EVENT = "gg-meet:meeting-audio-preferences-change";

const DEFAULT_MEETING_AUDIO_PREFERENCES: MeetingAudioPreferences = {
  guestAdmitted: "default",
  hostWaitingRequest: "default",
};

function isMeetingAudioSoundId(value: unknown): value is MeetingAudioSoundId {
  return (
    typeof value === "string" &&
    VALID_MEETING_AUDIO_SOUND_IDS.has(value as MeetingAudioSoundId)
  );
}

function normalizeMeetingAudioPreferences(value: unknown): MeetingAudioPreferences {
  if (!value || typeof value !== "object") {
    return { ...DEFAULT_MEETING_AUDIO_PREFERENCES };
  }

  const preferences = value as Partial<Record<MeetingAudioKey, unknown>>;

  return {
    guestAdmitted: isMeetingAudioSoundId(preferences.guestAdmitted)
      ? preferences.guestAdmitted
      : DEFAULT_MEETING_AUDIO_PREFERENCES.guestAdmitted,
    hostWaitingRequest: isMeetingAudioSoundId(preferences.hostWaitingRequest)
      ? preferences.hostWaitingRequest
      : DEFAULT_MEETING_AUDIO_PREFERENCES.hostWaitingRequest,
  };
}

export function getDefaultMeetingAudioPreferences(): MeetingAudioPreferences {
  return { ...DEFAULT_MEETING_AUDIO_PREFERENCES };
}

export function getMeetingAudioPreferences(): MeetingAudioPreferences {
  if (typeof window === "undefined") {
    return getDefaultMeetingAudioPreferences();
  }

  try {
    return normalizeMeetingAudioPreferences(
      JSON.parse(
        window.localStorage.getItem(MEETING_AUDIO_PREFERENCES_STORAGE_KEY) ?? "null",
      ),
    );
  } catch {
    return getDefaultMeetingAudioPreferences();
  }
}

export function setMeetingAudioPreferences(preferences: MeetingAudioPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedPreferences = normalizeMeetingAudioPreferences(preferences);
  window.localStorage.setItem(
    MEETING_AUDIO_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizedPreferences),
  );
  window.dispatchEvent(new CustomEvent(MEETING_AUDIO_PREFERENCES_CHANGE_EVENT));
}

export function setMeetingAudioPreference(
  audioKey: MeetingAudioKey,
  soundId: MeetingAudioSoundId,
) {
  setMeetingAudioPreferences({
    ...getMeetingAudioPreferences(),
    [audioKey]: soundId,
  });
}

export function addMeetingAudioPreferencesChangeListener(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(MEETING_AUDIO_PREFERENCES_CHANGE_EVENT, listener);
  window.addEventListener("storage", listener);

  return () => {
    window.removeEventListener(MEETING_AUDIO_PREFERENCES_CHANGE_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}
