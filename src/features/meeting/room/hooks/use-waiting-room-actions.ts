"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import type {
  Participant,
  WaitingParticipant,
} from "@/components/meeting/room/types";
import type { MeetingSocketMessage } from "@/lib/meeting/meeting-websocket";

type UseWaitingRoomActionsParams = {
  meetingCode: string;
  waitingParticipants: WaitingParticipant[];
  sendAccept: (message: MeetingSocketMessage) => void;
  sendReject: (message: MeetingSocketMessage) => void;
  sendKickout: (message: MeetingSocketMessage) => void;
  removeWaitingParticipant: (participantId?: number | null) => void;
  requestWaitingRoomResync: () => void;
  onError: (message: string) => void;
};

export function useWaitingRoomActions({
  meetingCode,
  waitingParticipants,
  sendAccept,
  sendReject,
  sendKickout,
  removeWaitingParticipant,
  requestWaitingRoomResync,
  onError,
}: UseWaitingRoomActionsParams) {
  const handleApproveWaitingParticipant = useCallback((participant: WaitingParticipant) => {
    try {
      sendAccept({
        meetingCode,
        targetParticipantId: participant.participantId,
        targetName: participant.name,
      });
      removeWaitingParticipant(participant.participantId);
      requestWaitingRoomResync();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to approve this participant.";

      onError(errorMessage);
    }
  }, [meetingCode, onError, removeWaitingParticipant, requestWaitingRoomResync, sendAccept]);

  const handleRejectWaitingParticipant = useCallback((participant: WaitingParticipant) => {
    try {
      sendReject({
        meetingCode,
        targetParticipantId: participant.participantId,
        targetName: participant.name,
      });
      removeWaitingParticipant(participant.participantId);
      requestWaitingRoomResync();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to reject this participant.";

      onError(errorMessage);
    }
  }, [meetingCode, onError, removeWaitingParticipant, requestWaitingRoomResync, sendReject]);

  const handleApproveAllWaitingParticipants = useCallback(() => {
    let hasQueuedResync = false;

    waitingParticipants.forEach((participant) => {
      try {
        sendAccept({
          meetingCode,
          targetParticipantId: participant.participantId,
          targetName: participant.name,
        });
        removeWaitingParticipant(participant.participantId);
        hasQueuedResync = true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unable to approve all waiting participants.";

        onError(errorMessage);
      }
    });

    if (hasQueuedResync) {
      requestWaitingRoomResync();
    }
  }, [
    meetingCode,
    onError,
    removeWaitingParticipant,
    requestWaitingRoomResync,
    sendAccept,
    waitingParticipants,
  ]);

  const handleKickParticipant = useCallback((participant: Participant, isBan: boolean) => {
    const targetParticipantId = participant.participantId;

    if (targetParticipantId === null) {
      toast.error("Unable to remove participant", {
        description: "This participant's ID could not be resolved.",
      });
      return;
    }

    try {
      sendKickout({
        meetingCode,
        targetParticipantId,
        targetName: participant.name,
        isBan,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to remove this participant.";
      toast.error("Unable to remove participant", {
        description: errorMessage,
      });
    }
  }, [meetingCode, sendKickout]);

  return {
    handleApproveWaitingParticipant,
    handleRejectWaitingParticipant,
    handleApproveAllWaitingParticipants,
    handleKickParticipant,
  };
}
