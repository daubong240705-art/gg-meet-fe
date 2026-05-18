export function normalizeParticipantRole(role?: string | null) {
  const normalizedRole = role?.trim().toUpperCase();
  return normalizedRole || null;
}

function getFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function getNumericField(
  data: Record<string, unknown>,
  fieldNames: string[],
): number | null {
  for (const fieldName of fieldNames) {
    if (fieldName in data) {
      const parsedValue = getFiniteNumber(data[fieldName]);

      if (parsedValue !== null) {
        return parsedValue;
      }
    }
  }

  return null;
}

export const PARTICIPANT_ID_FIELD_NAMES = [
  "participantId",
  "participantID",
  "participant_id",
  "meetingParticipantId",
  "meetingParticipantID",
  "meeting_participant_id",
  "targetParticipantId",
  "target_participant_id",
];

export function decodeJwtPayload<
  T extends {
    sub?: string;
    metadata?: string;
  },
>(token?: string | null): T | null {
  if (!token) {
    return null;
  }

  const tokenParts = token.split(".");

  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const payload = tokenParts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(tokenParts[1].length / 4) * 4, "=");
    const decodedPayload =
      typeof atob === "function"
        ? atob(payload)
        : Buffer.from(payload, "base64").toString("utf-8");

    return JSON.parse(decodedPayload) as T;
  } catch {
    return null;
  }
}

export function getParticipantRoleFromMetadata(metadata?: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    const parsedMetadata = JSON.parse(metadata);

    if (typeof parsedMetadata === "object" && parsedMetadata !== null && "role" in parsedMetadata) {
      return normalizeParticipantRole(String(parsedMetadata.role));
    }
  } catch {
    return normalizeParticipantRole(metadata);
  }

  return null;
}

export function getParticipantAvatarFromMetadata(metadata?: string | null) {
  if (!metadata) {
    return null;
  }

  try {
    const parsedMetadata = JSON.parse(metadata);

    if (typeof parsedMetadata !== "object" || parsedMetadata === null || !("avatar" in parsedMetadata)) {
      return null;
    }

    const avatar = String(parsedMetadata.avatar ?? "").trim();
    return avatar || null;
  } catch {
    return null;
  }
}

export function getParticipantIdFromMetadata(metadata?: string | null): number | null {
  if (!metadata) {
    return null;
  }

  try {
    const parsedMetadata = JSON.parse(metadata) as unknown;

    if (typeof parsedMetadata !== "object" || parsedMetadata === null) {
      return null;
    }

    return getNumericField(
      parsedMetadata as Record<string, unknown>,
      PARTICIPANT_ID_FIELD_NAMES,
    );
  } catch {
    return null;
  }
}

export function getParticipantIdFromRecord(
  data?: Record<string, unknown> | null,
): number | null {
  if (!data) {
    return null;
  }

  return getNumericField(data, PARTICIPANT_ID_FIELD_NAMES);
}
