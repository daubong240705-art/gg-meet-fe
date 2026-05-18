import type { MeetingParticipantStatus } from "./types";

export const normalizeMeetingParticipantStatus = (
  status?: string | null,
): MeetingParticipantStatus | null => {
  const normalizedStatus = status?.trim().toUpperCase();
  return normalizedStatus ? normalizedStatus as MeetingParticipantStatus : null;
};

export const isMeetingParticipantAwaitingApproval = (
  status?: string | null,
) => {
  const normalizedStatus = normalizeMeetingParticipantStatus(status);
  return normalizedStatus === "WAITING" || normalizedStatus === "REJECT";
};

export const shouldHandleMeetingParticipantInLobby = (
  status?: string | null,
) => {
  const normalizedStatus = normalizeMeetingParticipantStatus(status);
  return isMeetingParticipantAwaitingApproval(normalizedStatus)
    || normalizedStatus === "REJECTED";
};
