"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { meetingApi } from "@/shared/services/meeting.service";
import type { MeetingSocketMessage } from "@/lib/meeting/meeting-websocket";
import { normalizeParticipantDisplayName } from "@/features/meeting/room/lib";

export type ScreenShareRequest = {
  requesterId: number;
  requesterName: string;
  requestedAt: number;
};

type UseScreenShareRequestsParams = {
  meetingCode: string;
  meetingToken?: string | null;
  canManageWaitingRoom: boolean;
};

export function useScreenShareRequests({
  meetingCode,
  meetingToken,
  canManageWaitingRoom,
}: UseScreenShareRequestsParams) {
  const [pendingShareRequests, setPendingShareRequests] = useState<ScreenShareRequest[]>([]);
  const [processingRequesterId, setProcessingRequesterId] = useState<number | null>(null);

  const handleScreenShareRequested = useCallback((message: MeetingSocketMessage) => {
    if (!canManageWaitingRoom) return;

    const requesterId = message.requesterId ?? message.targetParticipantId;
    const requesterName = normalizeParticipantDisplayName(
      message.requesterName ?? message.targetName,
      "A participant",
    );

    if (requesterId == null) return;

    setPendingShareRequests((current) => {
      if (current.some((r) => r.requesterId === requesterId)) {
        return current;
      }
      return [...current, { requesterId, requesterName, requestedAt: Date.now() }];
    });
  }, [canManageWaitingRoom]);

  const approveRequest = useCallback(async (requesterId: number) => {
    if (processingRequesterId !== null) return;

    setProcessingRequesterId(requesterId);
    try {
      await meetingApi.approveScreenShare(meetingCode, requesterId, meetingToken);
      setPendingShareRequests((current) => current.filter((r) => r.requesterId !== requesterId));
    } catch {
      toast.error("Failed to approve screen share request.");
    } finally {
      setProcessingRequesterId(null);
    }
  }, [meetingCode, meetingToken, processingRequesterId]);

  const rejectRequest = useCallback(async (requesterId: number) => {
    if (processingRequesterId !== null) return;

    setProcessingRequesterId(requesterId);
    try {
      await meetingApi.rejectScreenShare(meetingCode, requesterId, meetingToken);
      setPendingShareRequests((current) => current.filter((r) => r.requesterId !== requesterId));
    } catch {
      toast.error("Failed to reject screen share request.");
    } finally {
      setProcessingRequesterId(null);
    }
  }, [meetingCode, meetingToken, processingRequesterId]);

  const removeRequest = useCallback((requesterId: number) => {
    setPendingShareRequests((current) => current.filter((r) => r.requesterId !== requesterId));
  }, []);

  return {
    pendingShareRequests,
    processingRequesterId,
    handleScreenShareRequested,
    approveRequest,
    rejectRequest,
    removeRequest,
  };
}
