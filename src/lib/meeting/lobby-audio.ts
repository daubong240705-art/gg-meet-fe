export const GUEST_ADMITTED_AUDIO_SRC = "/audio/waitting-join.mp3";
export const HOST_WAITING_REQUEST_AUDIO_SRC = "/audio/hihi.mp3";

type MeetingAudioKey = "guestAdmitted" | "hostWaitingRequest";

const MEETING_AUDIO_SOURCES: Record<MeetingAudioKey, string> = {
  guestAdmitted: GUEST_ADMITTED_AUDIO_SRC,
  hostWaitingRequest: HOST_WAITING_REQUEST_AUDIO_SRC,
};

const meetingAudioCache: Partial<Record<MeetingAudioKey, HTMLAudioElement>> = {};

let isAudioPrimed = false;
let isPrimeListenerAttached = false;

function getMeetingAudio(audioKey: MeetingAudioKey) {
  if (typeof window === "undefined") {
    return null;
  }

  const existingAudio = meetingAudioCache[audioKey];

  if (existingAudio) {
    existingAudio.currentTime = 0;
    return existingAudio;
  }

  const nextAudio = new Audio(MEETING_AUDIO_SOURCES[audioKey]);
  nextAudio.preload = "auto";
  meetingAudioCache[audioKey] = nextAudio;
  nextAudio.currentTime = 0;
  return nextAudio;
}

function createPlaybackAudio(audioKey: MeetingAudioKey) {
  if (typeof window === "undefined") {
    return null;
  }

  const audio = new Audio(MEETING_AUDIO_SOURCES[audioKey]);
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

  const audioEntries = Object.keys(MEETING_AUDIO_SOURCES) as MeetingAudioKey[];

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
    audioEntries.forEach((audioKey) => {
      const audio = meetingAudioCache[audioKey];

      if (audio) {
        audio.muted = false;
      }
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

function playMeetingSound(audioKey: MeetingAudioKey) {
  ensureMeetingAudioReady();
  const audio = createPlaybackAudio(audioKey) ?? getMeetingAudio(audioKey);

  if (!audio) {
    return;
  }

  void audio.play().catch(() => {
    const fallbackAudio = getMeetingAudio(audioKey);

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
