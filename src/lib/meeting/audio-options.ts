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
  { key: "guestAdmitted", label: "Join approved" },
  { key: "hostWaitingRequest", label: "Waiting-room request" },
];

export const MEETING_AUDIO_SOUND_OPTIONS: Array<{
  id: MeetingAudioSoundId;
  label: string;
}> = [
  { id: "default", label: "System default" },
  { id: "waitingJoin", label: "Mixi sound" },
  { id: "hihi", label: "MJ sound" },
  { id: "plink", label: "Plink" },
  { id: "drop", label: "Drop" },
  { id: "hereYouGo", label: "Here you go" },
  { id: "knockBrush", label: "Knock brush" },
  { id: "ding", label: "Ding" },
  { id: "tada", label: "Tada" },
  { id: "boing", label: "Boing" },
  { id: "hi", label: "Hi" },
  { id: "none", label: "Off" },
];

export const DEFAULT_MEETING_AUDIO_SOURCES: Record<MeetingAudioKey, string> = {
  guestAdmitted: GUEST_ADMITTED_AUDIO_SRC,
  hostWaitingRequest: HOST_WAITING_REQUEST_AUDIO_SRC,
};

export const MEETING_AUDIO_SOUND_SOURCES: Partial<Record<MeetingAudioSoundId, string>> = {
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

export const VALID_MEETING_AUDIO_SOUND_IDS = new Set<MeetingAudioSoundId>(
  MEETING_AUDIO_SOUND_OPTIONS.map((option) => option.id),
);
