"use client";

import type { MeetingTrackType } from "@/shared/services/meeting.service";

import { RoomSidebarChatPanel } from "../chat/room-sidebar-chat-panel";
import { RoomSidebarParticipantsPanel } from "./room-sidebar-participants-panel";
import { RoomSidebarShell } from "./room-sidebar-shell";
import type {
  ChatMessage,
  OutboundChatMessage,
  Participant,
  SidebarPanel,
  SidebarTab,
  WaitingParticipant,
} from "../types";

type MutingParticipantTrack = {
  participantId: number;
  trackType: MeetingTrackType;
};

type RoomSidebarProps = {
  activePanel: SidebarPanel;
  isOpen?: boolean;
  participants: Participant[];
  waitingParticipants: WaitingParticipant[];
  canManageWaitingRoom: boolean;
  chatMessages: ChatMessage[];
  chatDraft: string;
  isChatReady: boolean;
  isSendingChat: boolean;
  firstUnreadMessageId: string | null;
  onChatDraftChange: (value: string) => void;
  onSendChatMessage: (payload: OutboundChatMessage) => void;
  onClearUnreadDivider: () => void;
  onApproveWaitingParticipant: (participant: WaitingParticipant) => void;
  onRejectWaitingParticipant: (participant: WaitingParticipant) => void;
  onApproveAllWaitingParticipants: () => void;
  onKickParticipant?: (participant: Participant, isBan: boolean) => void;
  mutingParticipantTrack?: MutingParticipantTrack | null;
  onMuteParticipantTrack?: (participant: Participant, trackType: MeetingTrackType) => void;
  onPanelChange: (panel: SidebarPanel) => void;
  onClose: () => void;
};

export default function RoomSidebar({
  activePanel,
  isOpen = true,
  participants,
  waitingParticipants,
  canManageWaitingRoom,
  chatMessages,
  chatDraft,
  isChatReady,
  isSendingChat,
  firstUnreadMessageId,
  onChatDraftChange,
  onSendChatMessage,
  onClearUnreadDivider,
  onApproveWaitingParticipant,
  onRejectWaitingParticipant,
  onApproveAllWaitingParticipants,
  onKickParticipant,
  mutingParticipantTrack,
  onMuteParticipantTrack,
  onPanelChange,
  onClose,
}: RoomSidebarProps) {
  if (!activePanel) {
    return null;
  }

  const currentTab: SidebarTab = activePanel;

  return (
    <RoomSidebarShell
      isOpen={isOpen}
      currentTab={currentTab}
      participantCount={participants.length}
      onTabChange={onPanelChange}
      onClose={onClose}
    >
      {currentTab === "participants" ? (
        <RoomSidebarParticipantsPanel
          participants={participants}
          waitingParticipants={waitingParticipants}
          canManageWaitingRoom={canManageWaitingRoom}
          onApproveWaitingParticipant={onApproveWaitingParticipant}
          onRejectWaitingParticipant={onRejectWaitingParticipant}
          onApproveAllWaitingParticipants={onApproveAllWaitingParticipants}
          onKickParticipant={onKickParticipant}
          mutingParticipantTrack={mutingParticipantTrack}
          onMuteParticipantTrack={onMuteParticipantTrack}
        />
      ) : (
        <RoomSidebarChatPanel
          currentTab={currentTab}
          isOpen={isOpen}
          chatMessages={chatMessages}
          chatDraft={chatDraft}
          isChatReady={isChatReady}
          isSendingChat={isSendingChat}
          firstUnreadMessageId={firstUnreadMessageId}
          onChatDraftChange={onChatDraftChange}
          onSendChatMessage={onSendChatMessage}
          onClearUnreadDivider={onClearUnreadDivider}
        />
      )}
    </RoomSidebarShell>
  );
}
