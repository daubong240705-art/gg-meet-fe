export function normalizeParticipantRole(role?: string | null) {
  const normalizedRole = role?.trim().toUpperCase();
  return normalizedRole || null;
}

const ROLE_FIELD_NAMES = [
  "role",
  "participantRole",
  "participant_role",
  "meetingRole",
  "meeting_role",
  "userRole",
  "user_role",
];

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
    const parsedMetadata = JSON.parse(metadata) as unknown;

    if (typeof parsedMetadata === "object" && parsedMetadata !== null) {
      const metadataRecord = parsedMetadata as Record<string, unknown>;

      for (const fieldName of ROLE_FIELD_NAMES) {
        const fieldValue = metadataRecord[fieldName];

        if (typeof fieldValue === "string" && fieldValue.trim()) {
          return normalizeParticipantRole(fieldValue);
        }
      }
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

function getStringField(
  data: Record<string, unknown>,
  fieldNames: string[],
): string | null {
  for (const fieldName of fieldNames) {
    const value = data[fieldName];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function getNestedRecordField(
  data: Record<string, unknown>,
  fieldNames: string[],
): Record<string, unknown> | null {
  for (const fieldName of fieldNames) {
    const value = data[fieldName];

    if (typeof value === "object" && value !== null) {
      return value as Record<string, unknown>;
    }
  }

  return null;
}

export function getParticipantDisplayNameFromRecord(
  data?: Record<string, unknown> | null,
): string | null {
  if (!data) {
    return null;
  }

  const directName = getStringField(data, [
    "displayName",
    "display_name",
    "fullName",
    "full_name",
    "name",
    "participantName",
    "participant_name",
    "targetName",
    "target_name",
    "requesterName",
    "requester_name",
    "userName",
    "username",
    "user_name",
    "guestName",
    "guest_name",
    "email",
  ]);

  if (directName) {
    return directName;
  }

  const nestedRecord = getNestedRecordField(data, [
    "user",
    "guest",
    "participant",
    "target",
    "requester",
    "profile",
  ]);

  return nestedRecord ? getParticipantDisplayNameFromRecord(nestedRecord) : null;
}

function normalizeFallbackDisplayName(fallback: string) {
  const normalizedFallback = fallback.trim();

  if (!normalizedFallback) {
    return "Guest";
  }

  try {
    const parsedFallback = JSON.parse(normalizedFallback) as unknown;

    if (typeof parsedFallback === "object" && parsedFallback !== null) {
      return getParticipantDisplayNameFromRecord(parsedFallback as Record<string, unknown>)
        ?? "Guest";
    }
  } catch {
    return normalizedFallback;
  }

  return normalizedFallback;
}

export function normalizeParticipantDisplayName(
  value?: string | null,
  fallback = "Guest",
): string {
  const normalizedFallback = normalizeFallbackDisplayName(fallback);
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return normalizedFallback;
  }

  try {
    const parsedValue = JSON.parse(normalizedValue) as unknown;

    if (typeof parsedValue === "object" && parsedValue !== null) {
      return getParticipantDisplayNameFromRecord(parsedValue as Record<string, unknown>)
        ?? normalizedFallback;
    }
  } catch {
    return normalizedValue;
  }

  return normalizedValue;
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
