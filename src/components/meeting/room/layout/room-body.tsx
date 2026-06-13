"use client";

import { useEffect, useState } from "react";
import { ConnectionState } from "livekit-client";
import { Loader2, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MeetingTrackType } from "@/shared/services/meeting.service";

import RoomSidebar from "../sidebar/room-sidebar";
import RoomStage from "../stage/room-stage";
import type {
  ChatMessage,
  OutboundChatMessage,
  Participant,
  SidebarPanel,
  WaitingParticipant,
} from "../types";

type MutingParticipantTrack = {
  participantId: number;
  trackType: MeetingTrackType;
};

const DESKTOP_SIDEBAR_MEDIA_QUERY = "(min-width: 1280px)";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQueryList.matches);

    handleChange();
    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

type RoomBodyProps = {
  meetingCode: string;
  isSidebarRendered: boolean;
  sidebarPanel: SidebarPanel;
  isSidebarOpen: boolean;
  participants: Participant[];
  waitingParticipants: WaitingParticipant[];
  canManageWaitingRoom: boolean;
  chatMessages: ChatMessage[];
  chatDraft: string;
  isChatReady: boolean;
  isSendingChat: boolean;
  firstUnreadMessageId: string | null;
  screenShareParticipant: Participant | null;
  isPageVisible: boolean;
  isLayoutMotionEnabled: boolean;
  isViewportResizing: boolean;
  isLiveKitEnabled: boolean;
  roomConnectionState: ConnectionState;
  hasRoomConnected: boolean;
  canPlaybackAudio: boolean;
  onStartAudio: () => void;
  onChatDraftChange: (value: string) => void;
  onSendChatMessage: (payload: OutboundChatMessage) => void;
  onClearUnreadDivider: () => void;
  onApproveWaitingParticipant: (participant: WaitingParticipant) => void;
  onRejectWaitingParticipant: (participant: WaitingParticipant) => void;
  onApproveAllWaitingParticipants: () => void;
  onKickParticipant: (participant: Participant, isBan: boolean) => void;
  mutingParticipantTrack?: MutingParticipantTrack | null;
  onMuteParticipantTrack: (participant: Participant, trackType: MeetingTrackType) => void;
  forcingStopScreenShareParticipantId?: number | null;
  onForceStopScreenShare?: (participant: Participant) => void;
  onPanelChange: (panel: SidebarPanel) => void;
};

export default function RoomBody({
  meetingCode,
  isSidebarRendered,
  sidebarPanel,
  isSidebarOpen,
  participants,
  waitingParticipants,
  canManageWaitingRoom,
  chatMessages,
  chatDraft,
  isChatReady,
  isSendingChat,
  firstUnreadMessageId,
  screenShareParticipant,
  isPageVisible,
  isLayoutMotionEnabled,
  isViewportResizing,
  isLiveKitEnabled,
  roomConnectionState,
  hasRoomConnected,
  canPlaybackAudio,
  onStartAudio,
  onChatDraftChange,
  onSendChatMessage,
  onClearUnreadDivider,
  onApproveWaitingParticipant,
  onRejectWaitingParticipant,
  onApproveAllWaitingParticipants,
  onKickParticipant,
  mutingParticipantTrack,
  onMuteParticipantTrack,
  forcingStopScreenShareParticipantId,
  onForceStopScreenShare,
  onPanelChange,
}: RoomBodyProps) {
  const isDesktopSidebarLayout = useMediaQuery(DESKTOP_SIDEBAR_MEDIA_QUERY);
  const shouldRenderSidebar = isSidebarRendered && Boolean(sidebarPanel);
  const isRoomReconnecting =
    roomConnectionState === ConnectionState.Reconnecting
    || roomConnectionState === ConnectionState.SignalReconnecting;
  const isRoomDisconnectedAfterConnect =
    isLiveKitEnabled
    && hasRoomConnected
    && roomConnectionState === ConnectionState.Disconnected;
  const sidebar = sidebarPanel ? (
    <RoomSidebar
      activePanel={sidebarPanel}
      isOpen={isSidebarOpen}
      participants={participants}
      waitingParticipants={waitingParticipants}
      canManageWaitingRoom={canManageWaitingRoom}
      chatMessages={chatMessages}
      chatDraft={chatDraft}
      isChatReady={isChatReady}
      isSendingChat={isSendingChat}
      firstUnreadMessageId={firstUnreadMessageId}
      onChatDraftChange={onChatDraftChange}
      onSendChatMessage={onSendChatMessage}
      onClearUnreadDivider={onClearUnreadDivider}
      onApproveWaitingParticipant={onApproveWaitingParticipant}
      onRejectWaitingParticipant={onRejectWaitingParticipant}
      onApproveAllWaitingParticipants={onApproveAllWaitingParticipants}
      onKickParticipant={onKickParticipant}
      mutingParticipantTrack={mutingParticipantTrack}
      onMuteParticipantTrack={onMuteParticipantTrack}
      onPanelChange={onPanelChange}
      onClose={() => onPanelChange(null)}
    />
  ) : null;

  return (
    <>
      {shouldRenderSidebar && !isDesktopSidebarLayout ? (
        <>
          <button
            type="button"
            aria-label="Close meeting panel"
            className={cn(
              "fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none xl:hidden",
              isSidebarOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            onClick={() => onPanelChange(null)}
          />
          <div
            className={cn(
              "fixed inset-x-3 bottom-20 top-16 z-40 flex motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none lg:left-5 lg:right-auto lg:w-96 xl:hidden",
              isSidebarOpen ? "translate-y-0 opacity-100 lg:translate-x-0" : "pointer-events-none translate-y-4 opacity-0 lg:-translate-x-5 lg:translate-y-0",
            )}
          >
            {sidebar}
          </div>
        </>
      ) : null}

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3 motion-reduce:transition-none lg:grid lg:grid-rows-[minmax(0,1fr)] lg:p-5 lg:pb-20 lg:pt-18",
          screenShareParticipant
            ? "pb-20 pt-24 sm:pt-20 lg:pb-20 lg:pt-18"
            : "pb-20 pt-16",
          isViewportResizing
            ? "motion-safe:transition-none"
            : "motion-safe:transition-[gap,padding,grid-template-columns] motion-safe:duration-200 motion-safe:ease-out",
          isSidebarOpen
            ? "xl:grid-cols-[24rem_minmax(0,1fr)] xl:gap-x-4"
            : "xl:grid-cols-[0rem_minmax(0,1fr)] xl:gap-x-0",
        )}
      >
        <div className="order-1 flex min-h-0 min-w-0 flex-1 flex-col gap-3 motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none xl:col-start-2 xl:row-start-1 xl:order-none">
          {isLiveKitEnabled && isRoomReconnecting ? (
            <Card
              role="status"
              className="flex items-start gap-3 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-950 dark:text-amber-50"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">Reconnecting to the meeting...</p>
                <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
                  Keep this tab open. Audio and video will resume automatically.
                </p>
              </div>
            </Card>
          ) : null}

          {isRoomDisconnectedAfterConnect ? (
            <Card
              role="alert"
              className="flex flex-col gap-3 border border-red-500/30 bg-red-500/10 px-4 py-4 text-red-950 sm:flex-row sm:items-center sm:justify-between dark:text-red-50"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                  <WifiOff className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Connection disconnected</p>
                  <p className="text-xs text-red-900/80 dark:text-red-100/80">
                    Retry if the meeting does not recover automatically.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </Card>
          ) : null}

          {isLiveKitEnabled && !canPlaybackAudio ? (
            <Card className="flex flex-col gap-3 border border-sky-500/30 bg-sky-500/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-sky-900 dark:text-sky-100">
                Browser is blocking remote audio. Click once to enable LiveKit audio playback.
              </p>
              <Button type="button" variant="secondary" onClick={onStartAudio}>
                Enable audio
              </Button>
            </Card>
          ) : null}

          <div className="min-h-0 flex-1">
            <RoomStage
              meetingCode={meetingCode}
              participants={participants}
              screenShareParticipant={screenShareParticipant}
              isPageVisible={isPageVisible}
              isLayoutMotionEnabled={isLayoutMotionEnabled}
              isViewportResizing={isViewportResizing}
              mutingParticipantTrack={mutingParticipantTrack}
              onMuteParticipantTrack={onMuteParticipantTrack}
              forcingStopScreenShareParticipantId={forcingStopScreenShareParticipantId}
              onForceStopScreenShare={onForceStopScreenShare}
            />
          </div>
        </div>

        {isDesktopSidebarLayout ? (
          <div
            className={cn(
              "order-2 hidden min-h-0 shrink-0 overflow-hidden motion-safe:transition-[opacity,transform,margin] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none xl:col-start-1 xl:row-start-1 xl:order-none xl:mt-2 xl:flex xl:h-[calc(100%-0.5rem)]",
              isSidebarOpen
                ? "xl:translate-x-0 xl:opacity-100"
                : "pointer-events-none xl:-translate-x-3 xl:opacity-0",
            )}
          >
            {sidebar}
          </div>
        ) : null}
      </div>
    </>
  );
}
