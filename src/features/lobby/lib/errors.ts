import {
  getMeetingApiErrorDescription,
} from "@/shared/services/meeting.service";

function getApiStatusCode(value?: number | string) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function shouldTreatPendingJoinErrorAsMeetingEnded(error: IBackendRes<unknown>) {
  const statusCode = getApiStatusCode(error.statusCode ?? error.status);
  const description = getMeetingApiErrorDescription(error)?.toLowerCase() || "";

  return statusCode === 404 || description.includes("already ended");
}
