import { sendRequest } from "@/lib/api/wrapper";
import { getBackendBaseUrl } from "@/lib/config/api-url";

const API_URL = getBackendBaseUrl();

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

export const meetingApi = {
    createInstantMeeting() {
        return sendRequest<IBackendRes<CreateMeetingResponseData>>({
            url: `${API_URL}/meetings`,
            method: "POST",
            useCredentials: true,
            auth: true,
        });
    },
};
