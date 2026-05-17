"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room as LiveKitRoom } from "livekit-client";

import { type MeetingSocketConnection } from "@/lib/meeting/meeting-websocket";
import { MeetingSocketProvider, useMeetingSocket } from "@/features/meeting/providers";
import {
  useRoomChat,
  useRoomDevices,
  useRoomHandRaise,
  useRoomIdentity,
  useRoomExitActions,
  useRoomLiveKitSession,
  useRoomMediaControls,
  useRoomParticipants,
  useRoomScreenShare,
  useRoomSidebarState,
  useRoomSocketEvents,
  useRoomViewportState,
  useWaitingRoomRequests,
  useWaitingRoomActions,
} from "@/features/meeting/room/hooks";

import RoomBody from "./room-body";
import RoomFooter from "./room-footer";
import RoomHeader from "./room-header";
import type { MeetingRoomProps } from "./types";

const LIVEKIT_ROOM_OPTIONS = {
  adaptiveStream: true,
  dynacast: true,
};

export default function MeetingRoom(props: MeetingRoomProps) {
  return (
    <MeetingSocketProvider>
      <MeetingRoomContent {...props} />
    </MeetingSocketProvider>
  );
}

function MeetingRoomContent({
  meetingCode,
  title,
  userName,
  isMicOn,
  isCameraOn,
  selectedMic,
  selectedCamera,
  livekitToken,
  meetingToken,
  hostId,
  hostName,
  onLeave,
}: MeetingRoomProps) {
  const {
    connect: connectMeetingSocket,
    disconnect: disconnectMeetingSocket,
    sendAccept,
    sendReject,
    sendKickout,
  } = useMeetingSocket();
  const {
    localEmail,
    localAvatarUrl,
    displayName,
    meetingTitle,
    liveKitUrl,
    isLiveKitEnabled,
    localRole,
    resolvedHostId,
    resolvedHostName,
    localMeetingParticipantId,
    canManageWaitingRoom,
    fallbackLocalParticipantIsHost,
  } = useRoomIdentity({
    title,
    userName,
    livekitToken,
    meetingToken,
    hostId,
    hostName,
  });
  const roomRef = useRef<LiveKitRoom | null>(null);
  const meetingSocketRef = useRef<MeetingSocketConnection | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [liveKitError, setLiveKitError] = useState<string | null>(null);

  const handleRoomDeviceError = useCallback((message: string) => {
    setLiveKitError(message);
  }, []);

  const { isPageVisible, isViewportResizing } = useRoomViewportState();
  const {
    activePanel,
    sidebarPanel,
    isSidebarOpen,
    isSidebarRendered,
    activePanelRef,
    isSidebarLayoutTransitioning,
    togglePanel,
    handlePanelChange,
  } = useRoomSidebarState();

  const {
    isMicEnabled,
    isCameraEnabled,
    handleToggleMic,
    handleToggleCamera,
  } = useRoomMediaControls({
    roomRef,
    isLiveKitEnabled,
    initialMicrophoneEnabled: isMicOn,
    initialCameraEnabled: isCameraOn,
    onError: handleRoomDeviceError,
  });

  const {
    localHandState,
    localHandStateRef,
    preferLocalHandStateRef,
    isHandRaiseCoolingDown,
    handleLiveKitLocalAttributesChange,
    handleToggleHandRaise,
    resetHandRaise,
  } = useRoomHandRaise({
    roomRef,
    isLiveKitEnabled,
    onError: handleRoomDeviceError,
  });

  const {
    microphoneDevices,
    cameraDevices,
    activeMicrophoneId,
    activeCameraId,
    syncAvailableDevices,
    handleSelectMicrophone,
    handleSelectCamera,
  } = useRoomDevices({
    roomRef,
    isLiveKitEnabled,
    onError: handleRoomDeviceError,
  });

  const {
    chatMessages,
    chatDraft,
    isSendingChat,
    unreadChatCount,
    setChatDraft,
    resetChat,
    clearUnreadChatCount,
    handleLiveKitChatMessage,
    handleSendChatMessage,
  } = useRoomChat({
    roomRef,
    activePanelRef,
    isLiveKitEnabled,
    displayName,
    localEmail,
    localAvatarUrl,
    onError: handleRoomDeviceError,
  });

  const {
    waitingParticipants,
    clearWaitingParticipants,
    upsertWaitingParticipant,
    removeWaitingParticipant,
    syncWaitingParticipants,
    requestWaitingRoomResync,
  } = useWaitingRoomRequests({
    canManageWaitingRoom,
    meetingCode,
    meetingToken,
    onError: handleRoomDeviceError,
  });

  const {
    isEndingMeeting,
    exitMeeting,
    handleLeaveMeeting,
    handleEndMeeting,
  } = useRoomExitActions({
    meetingCode,
    meetingToken,
    localMeetingParticipantId,
    roomRef,
    meetingSocketRef,
    disconnectMeetingSocket,
    resetHandRaise,
    onLeave,
    onError: handleRoomDeviceError,
  });

  const {
    handleApproveWaitingParticipant,
    handleRejectWaitingParticipant,
    handleApproveAllWaitingParticipants,
    handleKickParticipant,
  } = useWaitingRoomActions({
    meetingCode,
    waitingParticipants,
    sendAccept,
    sendReject,
    sendKickout,
    removeWaitingParticipant,
    requestWaitingRoomResync,
    onError: handleRoomDeviceError,
  });

  const handleLiveKitDeviceChange = useCallback((room: LiveKitRoom) => {
    void syncAvailableDevices(room);
  }, [syncAvailableDevices]);

  const {
    participants,
    handleLiveKitParticipantsChange,
  } = useRoomParticipants({
    displayName,
    localEmail,
    localAvatarUrl,
    resolvedHostId,
    resolvedHostName,
    localRole,
    localMeetingParticipantId,
    fallbackLocalParticipantIsHost,
    isLiveKitEnabled,
    isMicEnabled,
    isCameraEnabled,
    localHandState,
    localHandStateRef,
    preferLocalHandStateRef,
  });

  const {
    screenShareParticipants,
    screenShareParticipant,
    setActiveScreenShareId,
    isScreenSharing,
    handleScreenShare,
    handlePresentOtherContent,
  } = useRoomScreenShare({
    participants,
    roomRef,
    isLiveKitEnabled,
    onError: handleRoomDeviceError,
  });

  const {
    canPlaybackAudio,
    isRoomConnected,
    handleStartAudio,
  } = useRoomLiveKitSession({
    roomRef,
    enabled: isLiveKitEnabled,
    token: livekitToken,
    url: liveKitUrl,
    options: LIVEKIT_ROOM_OPTIONS,
    initialCameraEnabled: isCameraOn,
    initialMicrophoneEnabled: isMicOn,
    initialCameraDeviceId: selectedCamera,
    initialMicrophoneDeviceId: selectedMic,
    onParticipantsChange: handleLiveKitParticipantsChange,
    onLocalAttributesChange: handleLiveKitLocalAttributesChange,
    onChatMessage: handleLiveKitChatMessage,
    onDeviceChange: handleLiveKitDeviceChange,
    onError: setLiveKitError,
    onReset: resetChat,
  });

  useEffect(() => {
    if (activePanel === "chat") {
      clearUnreadChatCount();
    }
  }, [activePanel, clearUnreadChatCount]);

  useEffect(() => {
    void syncAvailableDevices();
  }, [syncAvailableDevices]);

  useEffect(() => {
    if (!canManageWaitingRoom || !meetingToken) {
      clearWaitingParticipants();
      return;
    }

    // OLD: host waiting room only accumulated JOIN_REQUEST websocket events, so any request
    // created while the host tab was away disappeared from the UI after rejoin.
    // NEW: fetch the current pending list from the API whenever the host enters/re-enters the room.
    void syncWaitingParticipants();
  }, [canManageWaitingRoom, clearWaitingParticipants, meetingToken, syncWaitingParticipants]);

  useRoomSocketEvents({
    meetingCode,
    meetingToken,
    canManageWaitingRoom,
    localMeetingParticipantId,
    meetingSocketRef,
    connectMeetingSocket,
    disconnectMeetingSocket,
    clearWaitingParticipants,
    syncWaitingParticipants,
    upsertWaitingParticipant,
    removeWaitingParticipant,
    exitMeeting,
    onError: handleRoomDeviceError,
  });

  return (
    <div className="h-screen overflow-hidden bg-background">
      <div className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_42%),linear-gradient(180deg,rgba(15,23,42,1),rgba(30,41,59,0.9))]">
        <RoomHeader
          meetingTitle={meetingTitle}
          participants={participants}
          screenShareParticipants={screenShareParticipants}
          screenShareParticipant={screenShareParticipant}
          canManageWaitingRoom={canManageWaitingRoom}
          waitingParticipants={waitingParticipants}
          onScreenShareParticipantChange={setActiveScreenShareId}
          onPanelChange={handlePanelChange}
          onApproveWaitingParticipant={handleApproveWaitingParticipant}
          onRejectWaitingParticipant={handleRejectWaitingParticipant}
          onApproveAllWaitingParticipants={handleApproveAllWaitingParticipants}
        />

        <RoomBody
          isSidebarRendered={isSidebarRendered}
          sidebarPanel={sidebarPanel}
          isSidebarOpen={isSidebarOpen}
          participants={participants}
          waitingParticipants={waitingParticipants}
          canManageWaitingRoom={canManageWaitingRoom}
          chatMessages={chatMessages}
          chatDraft={chatDraft}
          isChatReady={isLiveKitEnabled && isRoomConnected}
          isSendingChat={isSendingChat}
          screenShareParticipant={screenShareParticipant}
          isPageVisible={isPageVisible}
          isLayoutMotionEnabled={!isSidebarLayoutTransitioning && !isViewportResizing}
          isViewportResizing={isViewportResizing}
          isLiveKitEnabled={isLiveKitEnabled}
          canPlaybackAudio={canPlaybackAudio}
          onStartAudio={handleStartAudio}
          onChatDraftChange={setChatDraft}
          onSendChatMessage={handleSendChatMessage}
          onApproveWaitingParticipant={handleApproveWaitingParticipant}
          onRejectWaitingParticipant={handleRejectWaitingParticipant}
          onApproveAllWaitingParticipants={handleApproveAllWaitingParticipants}
          onKickParticipant={handleKickParticipant}
          onPanelChange={handlePanelChange}
        />

        <RoomFooter
          meetingCode={meetingCode}
          participantsCount={participants.length}
          unreadChatCount={unreadChatCount}
          activePanel={activePanel}
          isMicEnabled={isMicEnabled}
          isCameraEnabled={isCameraEnabled}
          isScreenSharing={isScreenSharing}
          isHandRaised={participants.some((participant) => participant.isLocal && participant.handRaised)}
          isHandRaiseCoolingDown={isHandRaiseCoolingDown}
          microphoneDevices={microphoneDevices}
          cameraDevices={cameraDevices}
          activeMicrophoneId={activeMicrophoneId}
          activeCameraId={activeCameraId}
          onToggleMic={handleToggleMic}
          onToggleCamera={handleToggleCamera}
          onToggleScreenShare={handleScreenShare}
          onToggleHandRaise={handleToggleHandRaise}
          onPresentOtherContent={handlePresentOtherContent}
          onSelectMicrophone={handleSelectMicrophone}
          onSelectCamera={handleSelectCamera}
          onRefreshDevices={() => {
            void syncAvailableDevices();
          }}
          onTogglePanel={togglePanel}
          isHost={canManageWaitingRoom}
          isEndingMeeting={isEndingMeeting}
          onEndMeeting={handleEndMeeting}
          onLeave={handleLeaveMeeting}
        />
      </div>
    </div>
  );
}
