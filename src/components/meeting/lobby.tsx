"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuthSession } from "@/lib/auth/auth-session";
import { readStoredAccessToken } from "@/lib/auth/auth-token";
import {
  clearInstantMeetingSession,
  readInstantMeetingSession,
} from "@/lib/meeting/instant-meeting-session";
import { getMeetingDevicePreferences } from "@/lib/meeting/device-preferences";
import {
  LobbyRejectedRequest,
  LobbySetupView,
  LobbyWaitingApproval,
} from "@/features/lobby/components";
import {
  useLobbyDevices,
  useLobbyJoinFlow,
  useLobbyJoinSession,
  useLobbyWaitingSocket,
  useLobbyWaitingSocketState,
} from "@/features/lobby/hooks";
import { MEETING_IMAGES } from "@/lib/meeting/assets";
import { ensureMeetingAudioReady } from "@/lib/meeting/lobby-audio";
import { MeetingSocketProvider, useMeetingSocket } from "@/features/meeting/providers";
import {
  createGuestId,
} from "@/features/lobby/lib/join-state";
import type { LobbyJoinPayload } from "@/features/lobby/types";
import {
  isMeetingParticipantAwaitingApproval,
  normalizeMeetingParticipantStatus,
} from "@/shared/services/meeting.service";

type LobbyProps = {
  meetingCode: string;
  meetingTitle?: string | null;
  hostId?: string | null;
  hostEmail?: string | null;
  onJoin: (payload: LobbyJoinPayload) => void;
  onMeetingEnded: () => void;
};

export type { LobbyJoinPayload };

const WAITING_APPROVAL_IMAGE_SRC = MEETING_IMAGES.waitingApproval;

export default function Lobby(props: LobbyProps) {
  return (
    <MeetingSocketProvider>
      <LobbyContent {...props} />
    </MeetingSocketProvider>
  );
}

function LobbyContent({
  meetingCode,
  meetingTitle,
  hostId,
  hostEmail,
  onJoin,
  onMeetingEnded,
}: LobbyProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthSession();
  const {
    connect: connectMeetingSocket,
    disconnect: disconnectMeetingSocket,
    isSocketConnected,
    sendCancel,
  } = useMeetingSocket();
  const initialMeetingSession = readInstantMeetingSession(meetingCode);
  const initialDevicePreferences = getMeetingDevicePreferences();
  const initialParticipantStatus = normalizeMeetingParticipantStatus(
    initialMeetingSession?.participantStatus,
  );
  const sessionUserName = user?.fullName?.trim() || user?.email?.trim() || "";
  const initialGuestName = !sessionUserName ? initialMeetingSession?.userName?.trim() || "" : "";
  const [userNameOverride, setUserNameOverride] = useState(initialGuestName);
  const [hasEditedName, setHasEditedName] = useState(Boolean(initialGuestName));
  const [guestId] = useState(() => {
    return initialMeetingSession?.guestId?.trim() || createGuestId();
  });
  const {
    videoRef,
    isCameraOn,
    isMicOn,
    videoDevices,
    audioDevices,
    selectedCamera,
    selectedMic,
    openMenu,
    deviceError,
    setIsCameraOn,
    setIsMicOn,
    setSelectedCamera,
    setSelectedMic,
    setOpenMenu,
  } = useLobbyDevices({
    initialIsCameraOn: initialMeetingSession?.isCameraOn ?? initialDevicePreferences.cameraEnabledOnJoin,
    initialIsMicOn: initialMeetingSession?.isMicOn ?? initialDevicePreferences.microphoneEnabledOnJoin,
    initialCameraDeviceId:
      initialMeetingSession?.selectedCamera?.trim()
      || initialDevicePreferences.defaultCameraDeviceId,
    initialMicrophoneDeviceId:
      initialMeetingSession?.selectedMic?.trim()
      || initialDevicePreferences.defaultMicrophoneDeviceId,
  });
  const {
    pendingJoinState,
    setPendingJoinState,
    updatePendingJoinState,
    pendingJoinStateRef,
    hasTriggeredUnloadCancelRef,
    hasHandledMeetingEndedRef,
    hasCompletedPendingJoinRef,
    isMountedRef,
    persistLobbySession,
  } = useLobbyJoinSession({
    initialMeetingSession,
    initialParticipantStatus,
  });

  const hasAccessToken =
    typeof window !== "undefined" ? Boolean(readStoredAccessToken()) : false;
  const isSignedIn = isAuthenticated && hasAccessToken;
  const rawUserName = isSignedIn
    ? sessionUserName
    : hasEditedName
      ? userNameOverride
      : "";
  const userName = rawUserName.trim();
  const normalizedUserId = user?.id !== undefined && user?.id !== null
    ? user.id.toString()
    : "";
  const normalizedUserEmail = user?.email?.trim().toLowerCase() || "";
  const normalizedHostId = hostId?.trim() || initialMeetingSession?.hostId?.trim() || "";
  const normalizedHostEmail = hostEmail?.trim().toLowerCase() || "";
  // OLD: the lobby CTA always said "Request to join", even for the meeting host who
  // joins directly without ever entering the waiting room.
  // NEW: detect the verified host and keep the CTA as a direct "Join" action.
  const isHostUser = isSignedIn && Boolean(
    (normalizedHostId && normalizedHostId === normalizedUserId)
    || (normalizedHostEmail && normalizedHostEmail === normalizedUserEmail)
  );
  const displayName = userName || pendingJoinState?.userName?.trim() || "Guest";
  const canJoinMeeting = userName.length > 0;
  const meetingName = meetingTitle?.trim() || meetingCode || "your meeting";
  const pendingParticipantStatus = normalizeMeetingParticipantStatus(
    pendingJoinState?.participantStatus,
  );
  const isWaitingForApproval = isMeetingParticipantAwaitingApproval(pendingParticipantStatus);
  const isRejected =
    pendingJoinState !== null
    && pendingParticipantStatus !== null
    && !isWaitingForApproval
    && pendingParticipantStatus !== "ACCEPT";

  const {
    waitingSocketRef,
    disconnectCancelTimeoutRef,
    waitingSocketError,
    setWaitingSocketError,
    isWaitingSocketConnected,
    setIsWaitingSocketConnected,
    waitingSocketRetryKey,
    setWaitingSocketRetryKey,
    clearDisconnectCancelTimeout,
  } = useLobbyWaitingSocketState({
    isWaitingForApproval,
    pendingJoinState,
    hasCompletedPendingJoinRef,
    hasTriggeredUnloadCancelRef,
  });

  const {
    joinMeetingMutation,
    handleMeetingEnded,
    completeApprovedJoin,
    requestApprovedJoin,
    syncPendingJoinStatus,
  } = useLobbyJoinFlow({
    meetingCode,
    isMicOn,
    isCameraOn,
    selectedMic,
    selectedCamera,
    waitingSocketRef,
    hasHandledMeetingEndedRef,
    hasCompletedPendingJoinRef,
    isMountedRef,
    clearDisconnectCancelTimeout,
    disconnectMeetingSocket,
    persistLobbySession,
    updatePendingJoinState,
    setPendingJoinState,
    setIsWaitingSocketConnected,
    setWaitingSocketError,
    setWaitingSocketRetryKey,
    onJoin,
    onMeetingEnded,
  });

  useLobbyWaitingSocket({
    meetingCode,
    pendingJoinState,
    pendingParticipantStatus,
    isWaitingForApproval,
    isMicOn,
    isCameraOn,
    selectedMic,
    selectedCamera,
    waitingSocketRetryKey,
    waitingSocketRef,
    disconnectCancelTimeoutRef,
    pendingJoinStateRef,
    hasTriggeredUnloadCancelRef,
    isMountedRef,
    isWaitingSocketConnected,
    setIsWaitingSocketConnected,
    setWaitingSocketError,
    connectMeetingSocket,
    disconnectMeetingSocket,
    isSocketConnected,
    sendCancel,
    clearDisconnectCancelTimeout,
    syncPendingJoinStatus,
    requestApprovedJoin,
    completeApprovedJoin,
    handleMeetingEnded,
    updatePendingJoinState,
    persistLobbySession,
  });

  useEffect(() => {
    ensureMeetingAudioReady();
  }, []);

  if (isWaitingForApproval && pendingJoinState) {
    return (
      <LobbyWaitingApproval
        imageSrc={WAITING_APPROVAL_IMAGE_SRC}
        isConnected={isWaitingSocketConnected}
        errorMessage={waitingSocketError}
      />
    );
  }

  if (isRejected && pendingJoinState) {
    return (
      <LobbyRejectedRequest
        onRequestAgain={() => {
          setIsWaitingSocketConnected(false);
          setWaitingSocketError("");
          setPendingJoinState(null);
          clearInstantMeetingSession(meetingCode);
        }}
        onGoHome={() => router.push("/")}
      />
    );
  }

  return (
    <LobbySetupView
      meetingName={meetingName}
      rawUserName={rawUserName}
      isSignedIn={isSignedIn}
      isHostUser={isHostUser}
      isJoinPending={joinMeetingMutation.isPending}
      canJoinMeeting={canJoinMeeting}
      videoRef={videoRef}
      isCameraOn={isCameraOn}
      isMicOn={isMicOn}
      displayName={displayName}
      avatarUrl={user?.avatarUrl}
      email={user?.email}
      audioDevices={audioDevices}
      videoDevices={videoDevices}
      selectedMic={selectedMic}
      selectedCamera={selectedCamera}
      openMenu={openMenu}
      deviceError={deviceError}
      onNameChange={(value) => {
        setHasEditedName(true);
        setUserNameOverride(value);
      }}
      onToggleCamera={() => {
        setIsCameraOn((value) => !value);
        setOpenMenu(null);
      }}
      onToggleMic={() => {
        setIsMicOn((value) => !value);
        setOpenMenu(null);
      }}
      onToggleMenu={(menu) => setOpenMenu(openMenu === menu ? null : menu)}
      onCloseMenu={() => setOpenMenu(null)}
      onSelectMic={setSelectedMic}
      onSelectCamera={setSelectedCamera}
      onJoin={() =>
        joinMeetingMutation.mutate({
          userName,
          guestId: isSignedIn ? null : guestId,
          isMicOn,
          isCameraOn,
          selectedMic,
          selectedCamera,
        })
      }
    />
  );
}
