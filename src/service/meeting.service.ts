import { sendRequest } from "@/lib/api/wrapper";
import { readStoredAccessToken } from "@/lib/auth/auth-token";
import { getBackendBaseUrl } from "@/lib/config/api-url";

const API_URL = getBackendBaseUrl();
const getCancelJoinProxyUrl = (meetingCode: string) =>
    `/api/proxy/meetings/${encodeURIComponent(meetingCode)}/cancel-join`;

export type MeetingParticipantStatus =
    | "ACCEPT"
    | "WAITING"
    | "REJECT"
    | "REJECTED"
    | (string & {});

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

export type ScheduleMeetingRequest = {
    title: string;
    isScheduled: true;
    meetingDate: string;
    meetingTime: string;
    description: string;
    emailList: string[];
};

export type ScheduleMeetingResponseData = CreateMeetingResponseData;
export type JoinMeetingResponseData = CreateMeetingResponseData;
export type JoinRequestStatusResponseData = JoinMeetingResponseData;
export type VerifyMeetingResponseData = {
    meetingCode?: string | null;
    title?: string | null;
    status?: string | null;
    host?: MeetingHost | null;
};
export type WaitingRoomRequestData = {
    participantId?: number | null;
    name?: string | null;
    email?: string | null;
    participantStatus?: string | null;
    requestedAt?: string | null;
};
export type EndMeetingResponseData = null;
export type MeetingApiFieldError = {
    field: string;
    message: string;
};

export type GuestJoinRequest = {
    guestId: string;
    guestName: string;
};

export type CancelJoinRequest = {
    guestId?: string | null;
    guestName?: string | null;
    targetParticipantId?: number | null;
    targetName?: string | null;
    meetingToken?: string | null;
};

type MeetingRequestOptions = {
    keepalive?: boolean;
};

export const DEFAULT_INSTANT_MEETING_TITLE = "Quick Team Sync";

const getStatusCode = (value?: number | string) => {
    if (value === undefined || value === null || value === "") {
        return null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

const containsRoomNotFoundError = (errors: unknown) => {
    if (typeof errors === "string") {
        return errors.trim().toUpperCase() === "ROOM_NOT_FOUND";
    }

    if (Array.isArray(errors)) {
        return errors.some((error) => typeof error === "string" && error.trim().toUpperCase() === "ROOM_NOT_FOUND");
    }

    return false;
};

const getApiErrorMessage = (value: unknown): string | null => {
    if (typeof value === "string") {
        const normalizedValue = value.trim();
        return normalizedValue || null;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            const nestedMessage = getApiErrorMessage(item);

            if (nestedMessage) {
                return nestedMessage;
            }
        }

        return null;
    }

    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const directMessageCandidates = [
        record.defaultMessage,
        record.message,
        record.error,
    ];

    for (const candidate of directMessageCandidates) {
        const resolvedCandidate = getApiErrorMessage(candidate);

        if (resolvedCandidate) {
            return resolvedCandidate;
        }
    }

    for (const nestedValue of Object.values(record)) {
        const nestedMessage = getApiErrorMessage(nestedValue);

        if (nestedMessage) {
            return nestedMessage;
        }
    }

    return null;
};

const getFieldErrorFromObject = (value: unknown): MeetingApiFieldError | null => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return null;
    }

    const record = value as Record<string, unknown>;
    const field = typeof record.field === "string" ? record.field.trim() : "";
    const message = getApiErrorMessage(record.defaultMessage ?? record.message ?? record.error ?? value);

    if (!field || !message) {
        return null;
    }

    return {
        field,
        message,
    };
};

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

export const getMeetingApiErrorDescription = (error: IBackendRes<unknown>) => {
    return getApiErrorMessage(error.errors)
        || getApiErrorMessage(error.error)
        || getApiErrorMessage(error.message);
};

export const getMeetingApiFieldErrors = (error: IBackendRes<unknown>): MeetingApiFieldError[] => {
    if (Array.isArray(error.errors)) {
        return error.errors
            .map((item) => getFieldErrorFromObject(item))
            .filter((item): item is MeetingApiFieldError => Boolean(item));
    }

    if (!error.errors || typeof error.errors !== "object") {
        return [];
    }

    return Object.entries(error.errors)
        .map(([field, value]) => {
            const normalizedField = field.trim();
            const message = getApiErrorMessage(value);

            if (!normalizedField || !message) {
                return null;
            }

            return {
                field: normalizedField,
                message,
            } satisfies MeetingApiFieldError;
        })
        .filter((item): item is MeetingApiFieldError => Boolean(item));
};

export const isMeetingNotFoundError = (error: IBackendRes<unknown>) => {
    const statusCode = getStatusCode(error.statusCode ?? error.status);
    return statusCode === 404 || containsRoomNotFoundError(error.errors);
};

const normalizeCancelJoinRequest = (request?: CancelJoinRequest | null) => {
    if (!request) {
        return null;
    }

    const normalizedRequest: Record<string, number | string> = {};

    if (typeof request.targetParticipantId === "number" && Number.isFinite(request.targetParticipantId)) {
        normalizedRequest.targetParticipantId = request.targetParticipantId;
    }

    const normalizedTargetName = request.targetName?.trim();

    if (normalizedTargetName) {
        normalizedRequest.targetName = normalizedTargetName;
    }

    const normalizedGuestId = request.guestId?.trim();

    if (normalizedGuestId) {
        normalizedRequest.guestId = normalizedGuestId;
    }

    const normalizedGuestName = request.guestName?.trim();

    if (normalizedGuestName) {
        normalizedRequest.guestName = normalizedGuestName;
    }

    const normalizedMeetingToken = request.meetingToken?.trim();

    if (normalizedMeetingToken) {
        normalizedRequest.meetingToken = normalizedMeetingToken;
    }

    return Object.keys(normalizedRequest).length > 0 ? normalizedRequest : null;
};

const getMeetingTokenHeaders = (meetingToken?: string | null) => {
    const normalizedMeetingToken = meetingToken?.trim();

    if (!normalizedMeetingToken) {
        return undefined;
    }

    return {
        "Meeting-Token": normalizedMeetingToken,
    };
};

export const meetingApi = {
    createInstantMeeting(title: string = DEFAULT_INSTANT_MEETING_TITLE) {
        return sendRequest<IBackendRes<CreateMeetingResponseData>>({
            url: `${API_URL}/meetings`,
            method: "POST",
            queryParams: {
                title,
            },
            useCredentials: true,
            auth: true,
        });
    },

    scheduleMeeting(meetingData: ScheduleMeetingRequest) {
        return sendRequest<IBackendRes<ScheduleMeetingResponseData>>({
            url: `${API_URL}/meetings/schedule`,
            method: "POST",
            body: meetingData,
            useCredentials: true,
            auth: true,
        });
    },

    joinMeeting(meetingCode: string, guestRequest?: GuestJoinRequest | null) {
        const accessToken =
            typeof window !== "undefined" ? readStoredAccessToken() : null;

        return sendRequest<IBackendRes<JoinMeetingResponseData>>({
            url: `${API_URL}/meetings/${encodeURIComponent(meetingCode)}/join`,
            method: "POST",
            body: accessToken
                ? undefined
                : guestRequest && guestRequest.guestId.trim() && guestRequest.guestName.trim()
                    ? {
                        guestId: guestRequest.guestId.trim(),
                        guestName: guestRequest.guestName.trim(),
                    }
                    : undefined,
            useCredentials: true,
            auth: Boolean(accessToken),
            accessToken,
            redirectOnAuthFail: false,
        });
    },

    verifyMeeting(meetingCode: string) {
        return sendRequest<IBackendRes<VerifyMeetingResponseData | null>>({
            url: `${API_URL}/meetings/verify`,
            method: "POST",
            queryParams: {
                meetingCode,
            },
            redirectOnAuthFail: false,
        });
    },

    getWaitingRoomRequests(meetingCode: string, meetingToken?: string | null) {
        return sendRequest<IBackendRes<WaitingRoomRequestData[]>>({
            url: `${API_URL}/meetings/${encodeURIComponent(meetingCode)}/waiting-room`,
            method: "GET",
            headers: getMeetingTokenHeaders(meetingToken),
            useCredentials: true,
            redirectOnAuthFail: false,
        });
    },

    getJoinRequestStatus(meetingCode: string, meetingToken?: string | null) {
        return sendRequest<IBackendRes<JoinRequestStatusResponseData>>({
            url: `${API_URL}/meetings/${encodeURIComponent(meetingCode)}/join-status`,
            method: "GET",
            headers: getMeetingTokenHeaders(meetingToken),
            useCredentials: true,
            redirectOnAuthFail: false,
        });
    },

    endMeeting(meetingCode: string) {
        const accessToken =
            typeof window !== "undefined" ? readStoredAccessToken() : null;

        return sendRequest<IBackendRes<EndMeetingResponseData>>({
            url: `${API_URL}/meetings`,
            method: "DELETE",
            queryParams: {
                meetingCode,
            },
            useCredentials: true,
            auth: Boolean(accessToken),
            accessToken,
            redirectOnAuthFail: false,
        });
    },

    cancelJoin(
        meetingCode: string,
        cancelJoinRequest?: CancelJoinRequest | null,
        options?: MeetingRequestOptions,
    ) {
        const accessToken =
            typeof window !== "undefined" ? readStoredAccessToken() : null;
        const normalizedCancelJoinRequest = normalizeCancelJoinRequest(cancelJoinRequest);

        return sendRequest<IBackendRes<null>>({
            url: getCancelJoinProxyUrl(meetingCode),
            method: "POST",
            body: normalizedCancelJoinRequest ?? undefined,
            useCredentials: true,
            auth: Boolean(accessToken),
            accessToken,
            redirectOnAuthFail: false,
            nextOption: options?.keepalive ? { keepalive: true } : undefined,
        });
    },

    cancelJoinWithBeacon(meetingCode: string, cancelJoinRequest?: CancelJoinRequest | null) {
        if (
            typeof navigator === "undefined"
            || typeof navigator.sendBeacon !== "function"
        ) {
            return false;
        }

        const normalizedCancelJoinRequest = normalizeCancelJoinRequest(cancelJoinRequest);

        const requestBody = normalizedCancelJoinRequest
            ? JSON.stringify(normalizedCancelJoinRequest)
            : "";

        return navigator.sendBeacon(
            getCancelJoinProxyUrl(meetingCode),
            new Blob([requestBody], { type: "application/json" }),
        );
    },
};
