export type MeetingRoomProps = {
  meetingCode: string;
  userName: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  onLeave: () => void;
};

export type ViewMode = "grid" | "speaker";
export type SidebarPanel = "participants" | "chat" | null;
export type SidebarTab = Exclude<SidebarPanel, null>;

export type Participant = {
  id: string;
  name: string;
  isHost: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
  accentClassName: string;
  status: string;
};

export type ChatMessage = {
  id: string;
  name: string;
  time: string;
  message: string;
};
