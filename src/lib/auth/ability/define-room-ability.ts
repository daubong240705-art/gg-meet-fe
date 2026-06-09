import { AbilityBuilder, createMongoAbility } from "@casl/ability";

import type { RoomSettings } from "@/shared/services/meeting/types";

import type { RoomAbility } from "./types";

export type RoomAbilityInput = {
  isHost: boolean;
  canUseHostMediaControls: boolean;
  roomSettings: RoomSettings;
};

export function defineRoomAbility({
  isHost,
  canUseHostMediaControls,
  roomSettings,
}: RoomAbilityInput): RoomAbility {
  const { can, build } = new AbilityBuilder<RoomAbility>(createMongoAbility);

  if (isHost) {
    can("manageWaitingRoom", "WaitingRoom");
    can("endMeeting", "Meeting");
    can("updateSettings", "RoomSettings");
    can("kick", "Participant", { isLocal: false, isHost: false });
    can("muteTrack", "Participant", { isLocal: false, isHost: false });
    can("forceStopShare", "Participant", { isLocal: false, isScreenSharing: true });
  }

  if (canUseHostMediaControls || roomSettings.allowParticipantUnmute) {
    can("unmuteSelf", "Meeting");
  }

  if (isHost || roomSettings.allowParticipantShareScreen) {
    can("shareScreen", "Meeting");
  }

  return build();
}
