import type { UpcomingMeetingResponseData } from "@/service/meeting.service";

const TIMEZONE_SUFFIX_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const LOCAL_DATE_TIME_PATTERN =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,9}))?)?)?$/;

export const STARTING_NOW_WINDOW_MS = 60_000;

export type UpcomingMeetingTimingState = "unknown" | "upcoming" | "starting-now" | "joinable" | "expired";

export type UpcomingMeetingTiming = {
    state: UpcomingMeetingTimingState;
    countdownLabel: string;
    isJoinable: boolean;
    startDate: Date | null;
    endDate: Date | null;
    normalizedStatus: string;
};

const isValidDate = (date: Date) => Number.isFinite(date.getTime());

export const parseBackendDateTime = (value?: string | null) => {
    const normalizedValue = value?.trim();

    if (!normalizedValue) {
        return null;
    }

    if (TIMEZONE_SUFFIX_PATTERN.test(normalizedValue)) {
        const parsedDate = new Date(normalizedValue);
        return isValidDate(parsedDate) ? parsedDate : null;
    }

    const localDateTimeMatch = normalizedValue.match(LOCAL_DATE_TIME_PATTERN);

    if (localDateTimeMatch) {
        const [, year, month, day, hour = "0", minute = "0", second = "0", fraction = ""] = localDateTimeMatch;
        const millisecond = fraction ? Number(fraction.padEnd(3, "0").slice(0, 3)) : 0;
        const parsedDate = new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            Number(second),
            millisecond,
        );

        if (
            parsedDate.getFullYear() === Number(year)
            && parsedDate.getMonth() === Number(month) - 1
            && parsedDate.getDate() === Number(day)
            && parsedDate.getHours() === Number(hour)
            && parsedDate.getMinutes() === Number(minute)
            && parsedDate.getSeconds() === Number(second)
        ) {
            return parsedDate;
        }

        return null;
    }

    const fallbackDate = new Date(normalizedValue);
    return isValidDate(fallbackDate) ? fallbackDate : null;
};

const startOfLocalDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const getRelativeDayLabel = (date: Date, nowMs: number) => {
    const dayDiff = Math.round((startOfLocalDay(date) - startOfLocalDay(new Date(nowMs))) / 86_400_000);

    if (dayDiff === 0) {
        return "Today";
    }

    if (dayDiff === 1) {
        return "Tomorrow";
    }

    if (dayDiff === -1) {
        return "Yesterday";
    }

    return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }).format(date);
};

export const formatUpcomingMeetingStart = (date: Date | null, nowMs: number) => {
    if (!date) {
        return "Time unavailable";
    }

    const dayLabel = getRelativeDayLabel(date, nowMs);
    const timeLabel = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
    }).format(date);

    return `${dayLabel}, ${timeLabel}`;
};

const formatStartsIn = (diffMs: number) => {
    const totalSeconds = Math.max(0, Math.ceil(diffMs / 1000));

    if (totalSeconds < 60) {
        return `Starts in ${totalSeconds}s`;
    }

    const totalMinutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (totalMinutes < 60) {
        return `Starts in ${totalMinutes}m ${seconds.toString().padStart(2, "0")}s`;
    }

    const totalHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (totalHours < 24) {
        return `Starts in ${totalHours}h ${minutes}m`;
    }

    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return `Starts in ${days}d ${hours}h`;
};

export const getUpcomingMeetingTiming = (
    meeting: UpcomingMeetingResponseData,
    nowMs: number,
): UpcomingMeetingTiming => {
    const normalizedStatus = meeting.status?.trim().toUpperCase() || "";
    const startDate = parseBackendDateTime(meeting.startTime);
    const endDate = parseBackendDateTime(meeting.endTime);
    const hasEnded = normalizedStatus === "ENDED" || Boolean(endDate && endDate.getTime() < nowMs);

    if (hasEnded) {
        return {
            state: "expired",
            countdownLabel: "Ended",
            isJoinable: false,
            startDate,
            endDate,
            normalizedStatus,
        };
    }

    if (normalizedStatus === "ACTIVE") {
        const hasJustStarted = startDate ? nowMs - startDate.getTime() <= STARTING_NOW_WINDOW_MS : false;

        return {
            state: hasJustStarted ? "starting-now" : "joinable",
            countdownLabel: hasJustStarted ? "Starting now" : "Join now",
            isJoinable: true,
            startDate,
            endDate,
            normalizedStatus,
        };
    }

    if (!startDate) {
        return {
            state: "unknown",
            countdownLabel: "Start time unavailable",
            isJoinable: false,
            startDate,
            endDate,
            normalizedStatus,
        };
    }

    const diffMs = startDate.getTime() - nowMs;

    if (diffMs <= 0) {
        return {
            state: Math.abs(diffMs) <= STARTING_NOW_WINDOW_MS ? "starting-now" : "joinable",
            countdownLabel: Math.abs(diffMs) <= STARTING_NOW_WINDOW_MS ? "Starting now" : "Join now",
            isJoinable: true,
            startDate,
            endDate,
            normalizedStatus,
        };
    }

    return {
        state: "upcoming",
        countdownLabel: formatStartsIn(diffMs),
        isJoinable: false,
        startDate,
        endDate,
        normalizedStatus,
    };
};

export const getUpcomingMeetingStatusLabel = (timing: UpcomingMeetingTiming) => {
    if (timing.state === "starting-now") {
        return "Starting now";
    }

    if (timing.state === "joinable") {
        return timing.normalizedStatus === "ACTIVE" ? "Active" : "Joinable";
    }

    if (timing.state === "expired") {
        return "Ended";
    }

    if (timing.normalizedStatus === "SCHEDULED") {
        return "Scheduled";
    }

    return timing.normalizedStatus || "Upcoming";
};
