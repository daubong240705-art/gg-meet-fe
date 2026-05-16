import type { MeetingSocketMessage } from "@/lib/meeting/meeting-websocket";
import type { WaitingRoomRequestData } from "@/shared/services/meeting.service";
import type { WaitingParticipant } from "@/components/meeting/room/types";

export function getWaitingParticipantName(message: MeetingSocketMessage) {
  return message.targetName?.trim() || "Guest";
}

export function mapWaitingRoomRequestToParticipant(request: WaitingRoomRequestData): WaitingParticipant | null {
  const participantId = request.participantId;

  if (typeof participantId !== "number" || !Number.isFinite(participantId)) {
    return null;
  }

  const requestedAtTimestamp = request.requestedAt ? Date.parse(request.requestedAt) : Number.NaN;

  return {
    participantId,
    name: request.name?.trim() || request.email?.trim() || "Guest",
    requestedAt: Number.isFinite(requestedAtTimestamp) ? requestedAtTimestamp : Date.now(),
  };
}
