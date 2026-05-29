"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import { toast } from "sonner";

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
  useRoomSettings,
  useRoomSidebarState,
  useRoomSocketEvents,
  useRoomTargetedMute,
  useRoomViewportState,
  useScreenShareRequests,
  useWaitingRoomRequests,
  useWaitingRoomActions,
} from "@/features/meeting/room/hooks";
import { meetingApi } from "@/shared/services/meeting.service";
import type { Participant } from "./types";

import { ScreenShareRequestDialog } from "./dialogs/screen-share-request-dialog";
import RoomFooter from "./footer/room-footer";
import RoomHeader from "./header/room-header";
import RoomBody from "./layout/room-body";
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
    localUserCanUseHostMediaControls,
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

  const handleRoomDeviceError = useCallback((message: string | null) => {
    if (!message) {
      return;
    }

    const isPermissionError = message === "Permission denied"
      || message.toLowerCase().includes("permission denied")
      || message.toLowerCase().includes("notallowederror");

    toast.error(isPermissionError ? "Microphone access denied" : "Unable to update media", {
      id: "media-device-error",
      description: isPermissionError
        ? "Allow microphone access in your browser settings, then try again."
        : message,
    });
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
  const [isCompactControlsOpen, setIsCompactControlsOpen] = useState(false);

  const handleToggleMeetingPanel = useCallback((panel: Exclude<typeof activePanel, null>) => {
    setIsCompactControlsOpen(false);
    togglePanel(panel);
  }, [togglePanel]);

  const handleMeetingPanelChange = useCallback((panel: typeof activePanel) => {
    if (panel) {
      setIsCompactControlsOpen(false);
    }

    handlePanelChange(panel);
  }, [handlePanelChange]);

  const handleToggleCompactControls = useCallback(() => {
    const shouldOpenCompactControls = !isCompactControlsOpen;

    if (shouldOpenCompactControls) {
      handlePanelChange(null);
    }

    setIsCompactControlsOpen(shouldOpenCompactControls);
  }, [handlePanelChange, isCompactControlsOpen]);

  // Room settings
  const {
    settings: roomSettings,
    updatingFields: updatingRoomSettingsFields,
    handleRoomMetadataChanged,
    handleRoomConnected,
    updateSettings: updateRoomSettings,
    patchSettings: patchRoomSettings,
  } = useRoomSettings({
    roomRef,
    meetingCode,
    meetingToken,
  });

  // Host always can unmute; participants can only unmute when room settings allow it.
  const canUnmuteMicrophone = localUserCanUseHostMediaControls
    || roomSettings.allowParticipantUnmute;

  const {
    isMicEnabled,
    isCameraEnabled,
    handleToggleMic,
    handleToggleCamera,
    syncLocalMediaState,
    suppressLocalMediaNotifications,
  } = useRoomMediaControls({
    roomRef,
    isLiveKitEnabled,
    initialMicrophoneEnabled: isMicOn,
    initialCameraEnabled: isCameraOn,
    canUnmuteMicrophone,
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
    onBeforeExit: suppressLocalMediaNotifications,
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
    removeParticipantByMeetingId,
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
    isShareRequestDialogOpen,
    isWaitingForShareApproval,
    isRequestingShareApproval,
    handleScreenShare,
    handlePresentOtherContent,
    handleSendShareRequest,
    handleShareApproved,
    handleShareRejected,
    handleShareStopped,
    handleCloseShareRequestDialog,
  } = useRoomScreenShare({
    participants,
    roomRef,
    isLiveKitEnabled,
    canShareScreen: roomSettings.allowParticipantShareScreen,
    isHost: canManageWaitingRoom,
    meetingCode,
    meetingToken,
    onError: handleRoomDeviceError,
  });

  const {
    mutingParticipantTrack,
    handleMuteParticipantTrack,
  } = useRoomTargetedMute({
    meetingCode,
    meetingToken,
  });

  // Force stop screen share
  const [forcingStopScreenShareParticipantId, setForcingStopScreenShareParticipantId] =
    useState<number | null>(null);

  const handleForceStopScreenShare = useCallback(async (participant: Participant) => {
    const targetId = participant.participantId;
    if (targetId == null || forcingStopScreenShareParticipantId !== null) return;

    setForcingStopScreenShareParticipantId(targetId);
    try {
      await meetingApi.forceStopScreenShare(meetingCode, targetId, meetingToken);
    } catch {
      toast.error("Failed to stop screen share.", { description: "Please try again." });
    } finally {
      setForcingStopScreenShareParticipantId(null);
    }
  }, [forcingStopScreenShareParticipantId, meetingCode, meetingToken]);

  // Screen share request handling (host side)
  const {
    pendingShareRequests,
    processingRequesterId,
    handleScreenShareRequested,
    approveRequest,
    rejectRequest,
  } = useScreenShareRequests({
    meetingCode,
    meetingToken,
    canManageWaitingRoom,
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
    onLocalMediaStateChange: syncLocalMediaState,
    onLocalAttributesChange: handleLiveKitLocalAttributesChange,
    onChatMessage: handleLiveKitChatMessage,
    onDeviceChange: handleLiveKitDeviceChange,
    onRoomMetadataChanged: handleRoomMetadataChanged,
    onError: handleRoomDeviceError,
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

    void syncWaitingParticipants();
  }, [canManageWaitingRoom, clearWaitingParticipants, meetingToken, syncWaitingParticipants]);

  // Read initial room metadata when connected
  useEffect(() => {
    if (isRoomConnected) {
      handleRoomConnected();
    }
  }, [isRoomConnected, handleRoomConnected]);

  const handleScreenShareApproved = useCallback(() => {
    handleShareApproved();
  }, [handleShareApproved]);

  const handleScreenShareRejected = useCallback(() => {
    handleShareRejected();
  }, [handleShareRejected]);

  const handleScreenShareStopped = useCallback(() => {
    handleShareStopped();
  }, [handleShareStopped]);

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
    removeParticipantByMeetingId,
    exitMeeting,
    onError: handleRoomDeviceError,
    onScreenShareRequested: handleScreenShareRequested,
    onScreenShareApproved: handleScreenShareApproved,
    onScreenShareRejected: handleScreenShareRejected,
    onScreenShareStopped: handleScreenShareStopped,
    onRoomSettingsChanged: patchRoomSettings,
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
          onPanelChange={handleMeetingPanelChange}
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
          mutingParticipantTrack={mutingParticipantTrack}
          onMuteParticipantTrack={handleMuteParticipantTrack}
          canForceStopScreenShare={canManageWaitingRoom}
          forcingStopScreenShareParticipantId={forcingStopScreenShareParticipantId}
          onForceStopScreenShare={handleForceStopScreenShare}
          onPanelChange={handleMeetingPanelChange}
        />

        <RoomFooter
          meetingCode={meetingCode}
          participantsCount={participants.length}
          unreadChatCount={unreadChatCount}
          activePanel={activePanel}
          isMicEnabled={isMicEnabled}
          canUnmuteMicrophone={canUnmuteMicrophone}
          isCameraEnabled={isCameraEnabled}
          isScreenSharing={isScreenSharing}
          isWaitingForShareApproval={isWaitingForShareApproval}
          isHandRaised={participants.some((participant) => participant.isLocal && participant.handRaised)}
          isHandRaiseCoolingDown={isHandRaiseCoolingDown}
          microphoneDevices={microphoneDevices}
          cameraDevices={cameraDevices}
          activeMicrophoneId={activeMicrophoneId}
          activeCameraId={activeCameraId}
          isHost={canManageWaitingRoom}
          roomSettings={roomSettings}
          updatingRoomSettingsFields={updatingRoomSettingsFields}
          onUpdateRoomSettings={(patch) => void updateRoomSettings(patch)}
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
          onTogglePanel={handleToggleMeetingPanel}
          isCompactControlsOpen={isCompactControlsOpen}
          onToggleCompactControls={handleToggleCompactControls}
          isEndingMeeting={isEndingMeeting}
          onEndMeeting={handleEndMeeting}
          onLeave={handleLeaveMeeting}
        />

        <ScreenShareRequestDialog
          open={isShareRequestDialogOpen}
          isRequesting={isRequestingShareApproval}
          onConfirm={() => void handleSendShareRequest()}
          onClose={handleCloseShareRequestDialog}
        />
      </div>

      {/* Pending requests panel for host - visible in participants sidebar */}
      {canManageWaitingRoom && pendingShareRequests.length > 0 ? (
        <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2">
          {pendingShareRequests.map((request) => (
            <div
              key={request.requesterId}
              className="flex items-center gap-3 rounded-2xl border border-border/80 bg-card/95 px-4 py-3 shadow-xl backdrop-blur-xl"
            >
              <p className="text-sm font-medium">{request.requesterName} wants to present</p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={processingRequesterId !== null}
                  onClick={() => void rejectRequest(request.requesterId)}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-medium transition hover:bg-secondary/80 disabled:opacity-50"
                >
                  Deny
                </button>
                <button
                  type="button"
                  disabled={processingRequesterId !== null}
                  onClick={() => void approveRequest(request.requesterId)}
                  className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                >
                  Allow
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
