"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import type {
  ConnectMeetingSocketParams,
  MeetingSocketConnection,
  MeetingSocketMessage,
} from "@/lib/meeting/meeting-websocket";

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
  exitMeeting: (reason?: "left" | "ended") => void;
  onError: (message: string) => void;
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
  exitMeeting,
  onError,
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
          if (isLocalKickMessage(message, localMeetingParticipantId)) {
            toast.error("Removed from meeting", {
              description: "You have been removed from the meeting by the host.",
            });
            exitMeeting("ended");
          } else if (message.targetName) {
            toast(`${message.targetName} was removed from the meeting.`);
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
          toast.error("Removed from meeting", {
            description: "You have been removed from the meeting by the host.",
          });
          exitMeeting("ended");
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
    removeWaitingParticipant,
    syncWaitingParticipants,
    upsertWaitingParticipant,
  ]);
}
