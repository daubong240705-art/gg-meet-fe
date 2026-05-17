import type { MeetingAudioKey } from "@/lib/meeting/lobby-audio";

export type ProfileTab = "profile" | "settings";
export type DeviceMenuKey = "camera" | "microphone" | null;

export type ProfileAvatarOption = {
  id: string;
  label: string;
  url: string;
};

export type ActiveAudioMenuKey = MeetingAudioKey | null;
