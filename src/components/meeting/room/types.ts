import type {
  LocalAudioTrack,
  LocalVideoTrack,
  RemoteAudioTrack,
  RemoteVideoTrack,
} from "livekit-client";

export type MeetingRoomProps = {
  meetingCode: string;
  userName: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  livekitToken?: string | null;
  hostId?: string | null;
  hostName?: string | null;
  onLeave: () => void;
};

export type SidebarPanel = "participants" | "chat" | null;
export type SidebarTab = Exclude<SidebarPanel, null>;

export type VideoTrackReference = LocalVideoTrack | RemoteVideoTrack;
export type AudioTrackReference = LocalAudioTrack | RemoteAudioTrack;

export type Participant = {
  id: string;
  identity: string;
  name: string;
  isHost: boolean;
  isLocal: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  accentClassName: string;
  status: string;
  cameraTrack: VideoTrackReference | null;
  audioTrack: AudioTrackReference | null;
  screenShareTrack: VideoTrackReference | null;
};

export type ChatMessage = {
  id: string;
  identity: string;
  name: string;
  isLocal: boolean;
  timestamp: number;
  time: string;
  message: string;
  editTimestamp?: number;
};
