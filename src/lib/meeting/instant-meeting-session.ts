const INSTANT_MEETING_STORAGE_KEY = "instant-meeting-session";

const isBrowser = typeof window !== "undefined";

export type InstantMeetingSession = {
    meetingCode: string;
    userName: string;
    guestId?: string | null;
    isMicOn: boolean;
    isCameraOn: boolean;
    livekitToken?: string | null;
    meetingToken?: string | null;
    participantStatus?: string | null;
    hostId?: string | null;
    hostName?: string | null;
};

type StoredInstantMeetings = Record<string, InstantMeetingSession>;

const normalizeMeetingCode = (meetingCode: string) => meetingCode.trim().toLowerCase();

const readStoredMeetings = (): StoredInstantMeetings => {
    if (!isBrowser) {
        return {};
    }

    try {
        const rawValue = window.sessionStorage.getItem(INSTANT_MEETING_STORAGE_KEY);

        if (!rawValue) {
            return {};
        }

        const parsedValue = JSON.parse(rawValue);
        return typeof parsedValue === "object" && parsedValue !== null ? parsedValue as StoredInstantMeetings : {};
    } catch {
        return {};
    }
};

const persistStoredMeetings = (meetings: StoredInstantMeetings) => {
    if (!isBrowser) {
        return;
    }

    if (Object.keys(meetings).length === 0) {
        window.sessionStorage.removeItem(INSTANT_MEETING_STORAGE_KEY);
        return;
    }

    window.sessionStorage.setItem(INSTANT_MEETING_STORAGE_KEY, JSON.stringify(meetings));
};

export const persistInstantMeetingSession = (session: InstantMeetingSession) => {
    if (!isBrowser) {
        return;
    }

    const nextMeetings = readStoredMeetings();
    nextMeetings[normalizeMeetingCode(session.meetingCode)] = session;
    persistStoredMeetings(nextMeetings);
};

export const readInstantMeetingSession = (meetingCode: string) => {
    if (!isBrowser) {
        return null;
    }

    const nextMeetings = readStoredMeetings();
    const normalizedMeetingCode = normalizeMeetingCode(meetingCode);
    return nextMeetings[normalizedMeetingCode] ?? null;
};

export const clearInstantMeetingSession = (meetingCode: string) => {
    if (!isBrowser) {
        return;
    }

    const nextMeetings = readStoredMeetings();
    const normalizedMeetingCode = normalizeMeetingCode(meetingCode);

    if (!(normalizedMeetingCode in nextMeetings)) {
        return;
    }

    delete nextMeetings[normalizedMeetingCode];
    persistStoredMeetings(nextMeetings);
};
