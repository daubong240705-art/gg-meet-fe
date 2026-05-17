"use client";

import { RoomSidebarChatPanel } from "./room-sidebar-chat-panel";
import { RoomSidebarParticipantsPanel } from "./room-sidebar-participants-panel";
import { RoomSidebarShell } from "./room-sidebar-shell";
import type {
  ChatMessage,
  OutboundChatMessage,
  Participant,
  SidebarPanel,
  SidebarTab,
  WaitingParticipant,
} from "./types";

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
  onChatDraftChange: (value: string) => void;
  onSendChatMessage: (payload: OutboundChatMessage) => void;
  onApproveWaitingParticipant: (participant: WaitingParticipant) => void;
  onRejectWaitingParticipant: (participant: WaitingParticipant) => void;
  onApproveAllWaitingParticipants: () => void;
  onKickParticipant?: (participant: Participant, isBan: boolean) => void;
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
  onChatDraftChange,
  onSendChatMessage,
  onApproveWaitingParticipant,
  onRejectWaitingParticipant,
  onApproveAllWaitingParticipants,
  onKickParticipant,
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
        />
      ) : (
        <RoomSidebarChatPanel
          currentTab={currentTab}
          isOpen={isOpen}
          chatMessages={chatMessages}
          chatDraft={chatDraft}
          isChatReady={isChatReady}
          isSendingChat={isSendingChat}
          onChatDraftChange={onChatDraftChange}
          onSendChatMessage={onSendChatMessage}
        />
      )}
    </RoomSidebarShell>
  );
}
