import type {
  LocalAudioTrack,
  LocalVideoTrack,
  RemoteAudioTrack,
  RemoteVideoTrack,
} from "livekit-client";

export type MeetingRoomProps = {
  meetingCode: string;
  title?: string | null;
  userName: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  livekitToken?: string | null;
  meetingToken?: string | null;
  hostId?: string | null;
  hostName?: string | null;
  onLeave: (reason?: "left" | "ended") => void;
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
  handRaised: boolean;
  handRaisedAt: number | null;
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

type ChatMessageBase = {
  id: string;
  identity: string;
  name: string;
  isLocal: boolean;
  timestamp: number;
  time: string;
  editTimestamp?: number;
};

export type ChatTextMessage = ChatMessageBase & {
  type: "text";
  content: string;
};

export type ChatStickerMessage = ChatMessageBase & {
  type: "sticker";
  stickerKey: string;
};

export type ChatMessage = ChatTextMessage | ChatStickerMessage;

export type OutboundChatMessage =
  | {
    type: "text";
    content: string;
  }
  | {
    type: "sticker";
    stickerKey: string;
  };

export type WaitingParticipant = {
  participantId: number;
  name: string;
  requestedAt: number;
};
