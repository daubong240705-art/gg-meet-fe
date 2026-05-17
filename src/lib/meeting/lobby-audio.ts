import { MEETING_AUDIO } from "./assets";

export const GUEST_ADMITTED_AUDIO_SRC = MEETING_AUDIO.guestAdmitted;
export const HOST_WAITING_REQUEST_AUDIO_SRC = MEETING_AUDIO.hostWaitingRequest;

export type MeetingAudioKey = "guestAdmitted" | "hostWaitingRequest";
export type MeetingAudioSoundId =
  | "default"
  | "waitingJoin"
  | "hihi"
  | "plink"
  | "drop"
  | "hereYouGo"
  | "knockBrush"
  | "ding"
  | "tada"
  | "boing"
  | "hi"
  | "none";
export type MeetingAudioPreferences = Record<MeetingAudioKey, MeetingAudioSoundId>;

export const MEETING_AUDIO_EVENTS: Array<{
  key: MeetingAudioKey;
  label: string;
}> = [
  {
    key: "guestAdmitted",
    label: "Join approved",
  },
  {
    key: "hostWaitingRequest",
    label: "Waiting-room request",
  },
];

export const MEETING_AUDIO_SOUND_OPTIONS: Array<{
  id: MeetingAudioSoundId;
  label: string;
}> = [
  {
    id: "default",
    label: "System default",
  },
  {
    id: "waitingJoin",
    label: "Mixi sound",
  },
  {
    id: "hihi",
    label: "MJ sound",
  },
  {
    id: "plink",
    label: "Plink",
  },
  {
    id: "drop",
    label: "Drop",
  },
  {
    id: "hereYouGo",
    label: "Here you go",
  },
  {
    id: "knockBrush",
    label: "Knock brush",
  },
  {
    id: "ding",
    label: "Ding",
  },
  {
    id: "tada",
    label: "Tada",
  },
  {
    id: "boing",
    label: "Boing",
  },
  {
    id: "hi",
    label: "Hi",
  },
  {
    id: "none",
    label: "Off",
  },
];

const MEETING_AUDIO_PREFERENCES_STORAGE_KEY = "gg-meet:meeting-audio-preferences:v1";
const MEETING_AUDIO_PREFERENCES_CHANGE_EVENT = "gg-meet:meeting-audio-preferences-change";

const DEFAULT_MEETING_AUDIO_PREFERENCES: MeetingAudioPreferences = {
  guestAdmitted: "default",
  hostWaitingRequest: "default",
};

const DEFAULT_MEETING_AUDIO_SOURCES: Record<MeetingAudioKey, string> = {
  guestAdmitted: GUEST_ADMITTED_AUDIO_SRC,
  hostWaitingRequest: HOST_WAITING_REQUEST_AUDIO_SRC,
};

const MEETING_AUDIO_SOUND_SOURCES: Partial<Record<MeetingAudioSoundId, string>> = {
  waitingJoin: GUEST_ADMITTED_AUDIO_SRC,
  hihi: HOST_WAITING_REQUEST_AUDIO_SRC,
  plink: "/audio/Plink.mp3",
  drop: "/audio/Drop.mp3",
  hereYouGo: "/audio/Here%20you%20go.mp3",
  knockBrush: "/audio/Knock%20brush.mp3",
  ding: "/audio/Ding.mp3",
  tada: "/audio/Tada.mp3",
  boing: "/audio/Boing.mp3",
  hi: "/audio/Hi.mp3",
};

const VALID_MEETING_AUDIO_SOUND_IDS = new Set<MeetingAudioSoundId>(
  MEETING_AUDIO_SOUND_OPTIONS.map((option) => option.id),
);

const meetingAudioCache: Record<string, HTMLAudioElement> = {};

let isAudioPrimed = false;
let isPrimeListenerAttached = false;

function isMeetingAudioSoundId(value: unknown): value is MeetingAudioSoundId {
  return typeof value === "string" && VALID_MEETING_AUDIO_SOUND_IDS.has(value as MeetingAudioSoundId);
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
      JSON.parse(window.localStorage.getItem(MEETING_AUDIO_PREFERENCES_STORAGE_KEY) ?? "null"),
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

export function setMeetingAudioPreference(audioKey: MeetingAudioKey, soundId: MeetingAudioSoundId) {
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

function resolveMeetingAudioSource(audioKey: MeetingAudioKey, soundId?: MeetingAudioSoundId) {
  const selectedSoundId = soundId ?? getMeetingAudioPreferences()[audioKey];

  if (selectedSoundId === "none") {
    return null;
  }

  if (selectedSoundId === "default") {
    return DEFAULT_MEETING_AUDIO_SOURCES[audioKey];
  }

  return MEETING_AUDIO_SOUND_SOURCES[selectedSoundId] ?? DEFAULT_MEETING_AUDIO_SOURCES[audioKey];
}

export function getMeetingAudioSource(audioKey: MeetingAudioKey) {
  return resolveMeetingAudioSource(audioKey);
}

function getMeetingAudio(audioKey: MeetingAudioKey, soundId?: MeetingAudioSoundId) {
  if (typeof window === "undefined") {
    return null;
  }

  const audioSource = resolveMeetingAudioSource(audioKey, soundId);

  if (!audioSource) {
    return null;
  }

  const cacheKey = `${audioKey}:${audioSource}`;
  const existingAudio = meetingAudioCache[cacheKey];

  if (existingAudio) {
    existingAudio.currentTime = 0;
    return existingAudio;
  }

  const nextAudio = new Audio(audioSource);
  nextAudio.preload = "auto";
  meetingAudioCache[cacheKey] = nextAudio;
  nextAudio.currentTime = 0;
  return nextAudio;
}

function createPlaybackAudio(audioKey: MeetingAudioKey, soundId?: MeetingAudioSoundId) {
  if (typeof window === "undefined") {
    return null;
  }

  const audioSource = resolveMeetingAudioSource(audioKey, soundId);

  if (!audioSource) {
    return null;
  }

  const audio = new Audio(audioSource);
  audio.preload = "auto";
  audio.currentTime = 0;
  return audio;
}

function detachPrimeListeners() {
  if (typeof window === "undefined" || !isPrimeListenerAttached) {
    return;
  }

  window.removeEventListener("pointerdown", primeMeetingAudioPlayback);
  window.removeEventListener("keydown", primeMeetingAudioPlayback);
  window.removeEventListener("touchstart", primeMeetingAudioPlayback);
  isPrimeListenerAttached = false;
}

async function primeMeetingAudioPlayback() {
  if (isAudioPrimed) {
    detachPrimeListeners();
    return;
  }

  const audioEntries = Object.keys(DEFAULT_MEETING_AUDIO_SOURCES) as MeetingAudioKey[];

  try {
    await Promise.all(audioEntries.map(async (audioKey) => {
      const audio = getMeetingAudio(audioKey);

      if (!audio) {
        return;
      }

      audio.muted = true;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.muted = false;
    }));

    isAudioPrimed = true;
    detachPrimeListeners();
  } catch {
    Object.values(meetingAudioCache).forEach((audio) => {
      audio.muted = false;
    });
  }
}

export function ensureMeetingAudioReady() {
  if (typeof window === "undefined") {
    return;
  }

  if (isAudioPrimed || isPrimeListenerAttached) {
    return;
  }

  isPrimeListenerAttached = true;
  window.addEventListener("pointerdown", primeMeetingAudioPlayback, { passive: true });
  window.addEventListener("keydown", primeMeetingAudioPlayback);
  window.addEventListener("touchstart", primeMeetingAudioPlayback, { passive: true });
}

function playMeetingSound(audioKey: MeetingAudioKey, soundId?: MeetingAudioSoundId) {
  ensureMeetingAudioReady();
  const audio = createPlaybackAudio(audioKey, soundId) ?? getMeetingAudio(audioKey, soundId);

  if (!audio) {
    return;
  }

  void audio.play().catch(() => {
    const fallbackAudio = getMeetingAudio(audioKey, soundId);

    if (!fallbackAudio) {
      return;
    }

    void fallbackAudio.play().catch(() => undefined);
  });
}

export function playGuestAdmittedSound() {
  playMeetingSound("guestAdmitted");
}

export function playHostWaitingRequestSound() {
  playMeetingSound("hostWaitingRequest");
}

export function playMeetingAudioPreview(audioKey: MeetingAudioKey, soundId: MeetingAudioSoundId) {
  playMeetingSound(audioKey, soundId);
}
