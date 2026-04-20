import z from "zod";

import type { ScheduleMeetingRequest } from "@/service/meeting.service";

const emailSchema = z
    .string()
    .trim()
    .email("Please enter a valid email address.");

const padNumber = (value: number) => value.toString().padStart(2, "0");

const isValidCalendarDate = (year: number, month: number, day: number) => {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return false;
    }

    const normalizedDate = new Date(Date.UTC(year, month - 1, day));

    return normalizedDate.getUTCFullYear() === year
        && normalizedDate.getUTCMonth() === month - 1
        && normalizedDate.getUTCDate() === day;
};

const normalizeEmail = (value: string) => value.trim();

export const DEFAULT_SCHEDULE_MEETING_DURATION = 30;

export const validateEmail = (value: string) => emailSchema.safeParse(value).success;

export const convertDateToApiDate = (value: string) => {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
        return null;
    }

    const isoDateMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (isoDateMatch) {
        const [, yearText, monthText, dayText] = isoDateMatch;
        const year = Number(yearText);
        const month = Number(monthText);
        const day = Number(dayText);

        return isValidCalendarDate(year, month, day)
            ? `${yearText}-${monthText}-${dayText}`
            : null;
    }

    const localizedDateMatch = normalizedValue.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);

    if (!localizedDateMatch) {
        return null;
    }

    const [, dayText, monthText, yearText] = localizedDateMatch;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);

    if (!isValidCalendarDate(year, month, day)) {
        return null;
    }

    return `${yearText}-${padNumber(month)}-${padNumber(day)}`;
};

export const convertTimeToApiTime = (value: string) => {
    const normalizedValue = value.trim();

    if (!normalizedValue) {
        return null;
    }

    const timeMatch = normalizedValue.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

    if (!timeMatch) {
        return null;
    }

    const [, hourText, minuteText, secondText] = timeMatch;
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const second = secondText ? Number(secondText) : 0;

    if (
        !Number.isInteger(hour)
        || !Number.isInteger(minute)
        || !Number.isInteger(second)
        || hour < 0
        || hour > 23
        || minute < 0
        || minute > 59
        || second < 0
        || second > 59
    ) {
        return null;
    }

    return `${padNumber(hour)}:${padNumber(minute)}:${padNumber(second)}`;
};

export const mergeParticipantEmails = (emailList: string[], participantEmail?: string) => {
    const dedupedEmails = new Map<string, string>();

    for (const rawEmail of [...emailList, participantEmail ?? ""]) {
        const normalizedEmail = normalizeEmail(rawEmail);

        if (!normalizedEmail) {
            continue;
        }

        const dedupeKey = normalizedEmail.toLowerCase();

        if (!dedupedEmails.has(dedupeKey)) {
            dedupedEmails.set(dedupeKey, normalizedEmail);
        }
    }

    return [...dedupedEmails.values()];
};

export const formatScheduleSummaryDate = (value: string) => {
    const apiDate = convertDateToApiDate(value);

    if (!apiDate) {
        return "";
    }

    const [year, month, day] = apiDate.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    return new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
    }).format(date);
};

export const formatScheduleSummaryTime = (value: string) => {
    const apiTime = convertTimeToApiTime(value);

    if (!apiTime) {
        return "";
    }

    return apiTime.slice(0, 5);
};

export const scheduleMeetingSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Meeting title is required."),
    date: z
        .string()
        .trim()
        .min(1, "Date is required.")
        .refine((value) => Boolean(convertDateToApiDate(value)), "Please choose a valid date."),
    time: z
        .string()
        .trim()
        .min(1, "Time is required.")
        .refine((value) => Boolean(convertTimeToApiTime(value)), "Please choose a valid time."),
    description: z
        .string()
        .trim(),
    participantEmail: z
        .string()
        .trim()
        .refine((value) => !value || validateEmail(value), "Please enter a valid email address."),
    emailList: z
        .array(
            z
                .string()
                .trim()
                .min(1)
                .refine((value) => validateEmail(value), "Please enter a valid email address."),
        )
        .default([]),
});

export type ScheduleMeetingFormValues = z.infer<typeof scheduleMeetingSchema>;

export const DEFAULT_SCHEDULE_MEETING_FORM_VALUES: ScheduleMeetingFormValues = {
    title: "",
    date: "",
    time: "",
    description: "",
    participantEmail: "",
    emailList: [],
};

export const buildScheduleMeetingPayload = (
    values: ScheduleMeetingFormValues,
): ScheduleMeetingRequest => ({
    title: values.title.trim(),
    isScheduled: true,
    meetingDate: convertDateToApiDate(values.date) ?? "",
    meetingTime: convertTimeToApiTime(values.time) ?? "",
    description: values.description.trim(),
    emailList: mergeParticipantEmails(values.emailList, values.participantEmail),
});
