import type { MeetingSocketMessage } from "@/lib/meeting/meeting-websocket";

export function getWaitingMessage(message: MeetingSocketMessage) {
  const action = message.action?.trim().toUpperCase();

  if (action === "ADMITTED") {
    return "The host admitted you to the meeting.";
  }

  if (action === "REJECTED") {
    return "The host declined this join request.";
  }

  return "Waiting for the host to respond.";
}
