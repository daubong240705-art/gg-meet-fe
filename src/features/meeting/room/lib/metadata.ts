export function normalizeParticipantRole(role?: string | null) {
  const normalizedRole = role?.trim().toUpperCase();
  return normalizedRole || null;
}

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
