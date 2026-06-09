import type { ForcedSubject, MongoAbility } from "@casl/ability";

export type AppAction = "read" | "manage";
export type AppSubject = "AdminPanel" | "User" | "all";
export type AppAbility = MongoAbility<[AppAction, AppSubject]>;

export type RoomAction =
  | "manageWaitingRoom"
  | "kick"
  | "muteTrack"
  | "forceStopShare"
  | "endMeeting"
  | "updateSettings"
  | "unmuteSelf"
  | "shareScreen";

export type ParticipantSubject = ForcedSubject<"Participant"> & {
  kind: "Participant";
  isLocal: boolean;
  isHost: boolean;
  isScreenSharing: boolean;
};

export type RoomSubject =
  | "WaitingRoom"
  | "Meeting"
  | "RoomSettings"
  | "Participant"
  | ParticipantSubject
  | "all";

export type RoomAbility = MongoAbility<[RoomAction, RoomSubject]>;
