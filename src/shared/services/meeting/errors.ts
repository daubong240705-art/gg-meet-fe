import type { MeetingApiFieldError } from "./types";

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

const containsMeetingScheduledNotStartedError = (errors: unknown) => {
  if (typeof errors === "string") {
    return errors.trim().toUpperCase() === "MEETING_SCHEDULED_NOT_STARTED";
  }

  if (Array.isArray(errors)) {
    return errors.some((error) => (
      typeof error === "string"
      && error.trim().toUpperCase() === "MEETING_SCHEDULED_NOT_STARTED"
    ));
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

export const isMeetingScheduledNotStartedError = (error: IBackendRes<unknown>) => {
  const statusCode = getStatusCode(error.statusCode ?? error.status);
  const description = getMeetingApiErrorDescription(error)?.toLowerCase() || "";

  return (
    statusCode === 400
    && (
      containsMeetingScheduledNotStartedError(error.errors)
      || description.includes("has not started yet")
    )
  );
};
