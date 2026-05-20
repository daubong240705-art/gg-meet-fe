"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import type {
  ConnectMeetingSocketParams,
  MeetingSocketConnection,
  MeetingSocketMessage,
} from "@/lib/meeting/meeting-websocket";
import type { RoomSettings } from "@/shared/services/meeting/types";

type UseRoomSocketEventsParams = {
  meetingCode: string;
  meetingToken?: string | null;
  canManageWaitingRoom: boolean;
  localMeetingParticipantId: number | null;
  meetingSocketRef: { current: MeetingSocketConnection | null };
  connectMeetingSocket: (params: ConnectMeetingSocketParams) => MeetingSocketConnection;
  disconnectMeetingSocket: (connection?: MeetingSocketConnection | null) => void;
  clearWaitingParticipants: () => void;
  syncWaitingParticipants: () => Promise<void>;
  upsertWaitingParticipant: (message: MeetingSocketMessage) => void;
  removeWaitingParticipant: (participantId?: number | null) => void;
  removeParticipantByMeetingId: (participantId: number) => void;
  exitMeeting: (reason?: "left" | "ended" | "kicked" | "banned") => void;
  onError: (message: string) => void;
  onScreenShareRequested?: (message: MeetingSocketMessage) => void;
  onScreenShareApproved?: (message: MeetingSocketMessage) => void;
  onScreenShareRejected?: (message: MeetingSocketMessage) => void;
  onScreenShareStopped?: (message: MeetingSocketMessage) => void;
  onRoomSettingsChanged?: (patch: Partial<RoomSettings>) => void;
};

function normalizeSocketAction(action?: string | null) {
  return action?.trim().toUpperCase() || "";
}

function isMeetingWaitingRemovalAction(action: string) {
  return (
    action === "ADMITTED"
    || action === "REJECTED"
    || action === "PARTICIPANT_LEFT"
    || action === "WAITING_CANCELLED"
    || action === "LEFT"
  );
}

function isParticipantWaitingRemovalAction(action: string) {
  return (
    action === "REJECT_SUCCESS"
    || action === "CANCEL_SUCCESS"
    || action === "PARTICIPANT_LEFT"
    || action === "WAITING_CANCELLED"
    || action === "LEFT"
  );
}

function isScreenShareRequestedAction(action: string) {
  return (
    action === "SCREEN_SHARE_REQUESTED"
    || action === "SCREEN_SHARE_REQUEST"
    || action === "SHARE_SCREEN_REQUESTED"
    || action === "REQUEST_SCREEN_SHARE"
  );
}

function isScreenShareApprovedAction(action: string) {
  return action === "SCREEN_SHARE_APPROVED" || action === "SHARE_SCREEN_APPROVED";
}

function isScreenShareRejectedAction(action: string) {
  return action === "SCREEN_SHARE_REJECTED" || action === "SHARE_SCREEN_REJECTED";
}

function isScreenShareStoppedAction(action: string) {
  return action === "SCREEN_SHARE_STOPPED" || action === "SHARE_SCREEN_STOPPED";
}

function isLocalKickMessage(
  message: MeetingSocketMessage,
  localMeetingParticipantId: number | null,
) {
  return (
    message.targetParticipantId !== null
    && message.targetParticipantId !== undefined
    && localMeetingParticipantId !== null
    && message.targetParticipantId === localMeetingParticipantId
  );
}

export function useRoomSocketEvents({
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
  onError,
  onScreenShareRequested,
  onScreenShareApproved,
  onScreenShareRejected,
  onScreenShareStopped,
  onRoomSettingsChanged,
}: UseRoomSocketEventsParams) {
  useEffect(() => {
    disconnectMeetingSocket(meetingSocketRef.current);
    meetingSocketRef.current = null;

    if (!meetingToken) {
      clearWaitingParticipants();
      return;
    }

    if (!canManageWaitingRoom) {
      clearWaitingParticipants();
    }

    const connection = connectMeetingSocket({
      meetingCode,
      meetingToken,
      subscribeToMeetingTopic: true,
      subscribeToWaitingTopic: canManageWaitingRoom,
      subscribeToParticipantTopic: true,
      onConnect: () => {
        if (canManageWaitingRoom) {
          void syncWaitingParticipants();
        }
      },
      onWaitingMessage: (message) => {
        const action = normalizeSocketAction(message.action);

        if (action === "JOIN_REQUEST") {
          upsertWaitingParticipant(message);
          return;
        }

        if (isScreenShareRequestedAction(action)) {
          onScreenShareRequested?.(message);
        }
      },
      onMeetingMessage: (message) => {
        const action = normalizeSocketAction(message.action);

        if (isMeetingWaitingRemovalAction(action)) {
          removeWaitingParticipant(message.targetParticipantId);
          return;
        }

        if (action === "MEETING_ENDED") {
          toast.error("Meeting ended", {
            description: "The host ended the meeting for everyone.",
          });
          exitMeeting("ended");
          return;
        }

        if (action === "USER_KICKED") {
          if (message.targetParticipantId != null) {
            removeParticipantByMeetingId(message.targetParticipantId);
          }

          if (!isLocalKickMessage(message, localMeetingParticipantId) && message.targetName) {
            toast(`${message.targetName} was removed from the meeting.`);
          }
          return;
        }

        if (isScreenShareRequestedAction(action)) {
          onScreenShareRequested?.(message);
          return;
        }

        if (action === "ROOM_SETTINGS_CHANGED") {
          const patch: Partial<RoomSettings> = {};
          if (message.allowParticipantUnmute != null) {
            patch.allowParticipantUnmute = message.allowParticipantUnmute;
          }
          if (message.allowParticipantShareScreen != null) {
            patch.allowParticipantShareScreen = message.allowParticipantShareScreen;
          }
          if (Object.keys(patch).length > 0) {
            onRoomSettingsChanged?.(patch);
          }
        }
      },
      onParticipantMessage: (message) => {
        const action = normalizeSocketAction(message.action);

        if (isParticipantWaitingRemovalAction(action)) {
          removeWaitingParticipant(message.targetParticipantId);
          return;
        }

        if (action === "USER_KICKED" && isLocalKickMessage(message, localMeetingParticipantId)) {
          const isBanned = message.isBan === true;
          toast.error(isBanned ? "Banned from meeting" : "Removed from meeting", {
            description: isBanned
              ? "You have been banned from this meeting by the host."
              : "You have been removed from the meeting by the host.",
          });
          exitMeeting(isBanned ? "banned" : "kicked");
          return;
        }

        if (isScreenShareApprovedAction(action)) {
          onScreenShareApproved?.(message);
          return;
        }

        if (isScreenShareRejectedAction(action)) {
          onScreenShareRejected?.(message);
          return;
        }

        if (isScreenShareStoppedAction(action)) {
          onScreenShareStopped?.(message);
        }
      },
      onError: (error) => {
        onError(error.message);
      },
    });

    meetingSocketRef.current = connection;

    return () => {
      disconnectMeetingSocket(connection);

      if (meetingSocketRef.current === connection) {
        meetingSocketRef.current = null;
      }
    };
  }, [
    canManageWaitingRoom,
    clearWaitingParticipants,
    connectMeetingSocket,
    disconnectMeetingSocket,
    exitMeeting,
    localMeetingParticipantId,
    meetingCode,
    meetingSocketRef,
    meetingToken,
    onError,
    removeParticipantByMeetingId,
    removeWaitingParticipant,
    syncWaitingParticipants,
    upsertWaitingParticipant,
    onScreenShareRequested,
    onScreenShareApproved,
    onScreenShareRejected,
    onScreenShareStopped,
    onRoomSettingsChanged,
  ]);
}
