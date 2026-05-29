"use client";

import type { Participant, SidebarPanel, WaitingParticipant } from "../types";
import { RoomHeaderParticipantsMenu } from "./room-header-participants-menu";
import { RoomHeaderPresentingTabs } from "./room-header-presenting-tabs";
import { RoomHeaderWaitingMenu } from "./room-header-waiting-menu";

type RoomHeaderProps = {
  meetingTitle: string;
  participants: Participant[];
  screenShareParticipants: Participant[];
  screenShareParticipant: Participant | null;
  canManageWaitingRoom: boolean;
  waitingParticipants: WaitingParticipant[];
  onScreenShareParticipantChange: (participantId: string) => void;
  onPanelChange: (panel: SidebarPanel) => void;
  onApproveWaitingParticipant: (participant: WaitingParticipant) => void;
  onRejectWaitingParticipant: (participant: WaitingParticipant) => void;
  onApproveAllWaitingParticipants: () => void;
};

export default function RoomHeader({
  meetingTitle,
  participants,
  screenShareParticipants,
  screenShareParticipant,
  canManageWaitingRoom,
  waitingParticipants,
  onScreenShareParticipantChange,
  onPanelChange,
  onApproveWaitingParticipant,
  onRejectWaitingParticipant,
  onApproveAllWaitingParticipants,
}: RoomHeaderProps) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 lg:px-5 lg:pt-4">
      <div className="pointer-events-auto grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,auto)_minmax(0,1fr)]">
        <div className="min-w-0 max-w-[min(24rem,calc(100vw-7rem))] px-1 py-1">
          <p className="truncate text-sm font-semibold text-white/95 lg:text-base">
            {meetingTitle}
          </p>
        </div>

        {screenShareParticipants.length > 0 ? (
          <RoomHeaderPresentingTabs
            screenShareParticipants={screenShareParticipants}
            screenShareParticipant={screenShareParticipant}
            onScreenShareParticipantChange={onScreenShareParticipantChange}
          />
        ) : null}

        <div className="flex items-center justify-end gap-2 lg:col-start-3">
          <RoomHeaderWaitingMenu
            canManageWaitingRoom={canManageWaitingRoom}
            waitingParticipants={waitingParticipants}
            onPanelChange={onPanelChange}
            onApproveWaitingParticipant={onApproveWaitingParticipant}
            onRejectWaitingParticipant={onRejectWaitingParticipant}
            onApproveAllWaitingParticipants={onApproveAllWaitingParticipants}
          />
          <RoomHeaderParticipantsMenu
            participants={participants}
            onPanelChange={onPanelChange}
          />
        </div>
      </div>
    </div>
  );
}
