export type LobbyJoinPayload = {
  title?: string | null;
  userName: string;
  guestId?: string | null;
  guestSecret?: string | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  selectedMic?: string | null;
  selectedCamera?: string | null;
  livekitToken?: string | null;
  meetingToken?: string | null;
  participantStatus?: string | null;
  hostId?: string | null;
  hostName?: string | null;
};

export type LobbyPendingJoinState = LobbyJoinPayload;
