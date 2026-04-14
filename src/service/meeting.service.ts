import { sendRequest } from "@/lib/api/wrapper";
import { readStoredAccessToken } from "@/lib/auth/auth-token";
import { getBackendBaseUrl } from "@/lib/config/api-url";

const API_URL = getBackendBaseUrl();

export type MeetingParticipantStatus = "ACCEPT" | "WAITING" | (string & {});

export type MeetingHost = {
    id?: number | null;
    fullName?: string | null;
    email?: string | null;
    role?: Role | null;
};

export type CreateMeetingResponseData = {
    host?: MeetingHost | null;
    meetingCode?: string | null;
    roomSid?: string | null;
    title?: string | null;
    status?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    livekitToken?: string | null;
    meetingToken?: string | null;
    participantStatus?: string | null;
};

export type JoinMeetingResponseData = CreateMeetingResponseData;

export const normalizeMeetingParticipantStatus = (
    status?: string | null,
): MeetingParticipantStatus | null => {
    const normalizedStatus = status?.trim().toUpperCase();
    return normalizedStatus ? normalizedStatus as MeetingParticipantStatus : null;
};

export const meetingApi = {
    createInstantMeeting() {
        return sendRequest<IBackendRes<CreateMeetingResponseData>>({
            url: `${API_URL}/meetings`,
            method: "POST",
            useCredentials: true,
            auth: true,
        });
    },

    joinMeeting(meetingCode: string, participantName?: string) {
        const accessToken =
            typeof window !== "undefined" ? readStoredAccessToken() : null;

        return sendRequest<IBackendRes<JoinMeetingResponseData>>({
            url: `${API_URL}/meetings/${encodeURIComponent(meetingCode)}/join`,
            method: "POST",
            body: participantName
                ? {
                    fullName: participantName.trim(),
                }
                : undefined,
            headers: accessToken
                ? {
                    Authorization: `Bearer ${accessToken}`,
                }
                : undefined,
            useCredentials: true,
        });
    },
};
