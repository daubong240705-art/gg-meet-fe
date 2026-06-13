import type { MeetingAudioKey, MeetingAudioSoundId } from "./audio-options";
import {
  DEFAULT_MEETING_AUDIO_SOURCES,
  MEETING_AUDIO_SOUND_SOURCES,
} from "./audio-options";
import { getMeetingAudioPreferences } from "./audio-preferences";

const meetingAudioCache: Record<string, HTMLAudioElement> = {};

function resolveMeetingAudioSource(
  audioKey: MeetingAudioKey,
  soundId?: MeetingAudioSoundId,
) {
  const selectedSoundId = soundId ?? getMeetingAudioPreferences()[audioKey];

  if (selectedSoundId === "none") {
    return null;
  }

  if (selectedSoundId === "default") {
    return DEFAULT_MEETING_AUDIO_SOURCES[audioKey];
  }

  return (
    MEETING_AUDIO_SOUND_SOURCES[selectedSoundId] ??
    DEFAULT_MEETING_AUDIO_SOURCES[audioKey]
  );
}

export function getMeetingAudioSource(audioKey: MeetingAudioKey) {
  return resolveMeetingAudioSource(audioKey);
}

function getMeetingAudio(
  audioKey: MeetingAudioKey,
  soundId?: MeetingAudioSoundId,
) {
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

function createPlaybackAudio(
  audioKey: MeetingAudioKey,
  soundId?: MeetingAudioSoundId,
) {
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

export function ensureMeetingAudioReady() {
  if (typeof window === "undefined") {
    return;
  }

  (Object.keys(DEFAULT_MEETING_AUDIO_SOURCES) as MeetingAudioKey[]).forEach(
    (audioKey) => {
      getMeetingAudio(audioKey)?.load();
    },
  );
}

function playMeetingSound(
  audioKey: MeetingAudioKey,
  soundId?: MeetingAudioSoundId,
) {
  ensureMeetingAudioReady();
  const audio =
    createPlaybackAudio(audioKey, soundId) ??
    getMeetingAudio(audioKey, soundId);

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

export function playMeetingAudioPreview(
  audioKey: MeetingAudioKey,
  soundId: MeetingAudioSoundId,
) {
  playMeetingSound(audioKey, soundId);
}
