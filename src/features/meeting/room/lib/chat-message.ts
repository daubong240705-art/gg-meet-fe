import {
  type ChatMessage as LiveKitChatMessage,
  Participant as LiveKitParticipant,
} from "livekit-client";

import type {
  ChatMessage,
  OutboundChatMessage,
} from "@/components/meeting/room/types";

import { getParticipantAvatarFromMetadata } from "./metadata";

type ParsedChatPayload =
  | {
    type: "text";
    content: string;
  }
  | {
    type: "sticker";
    stickerKey: string;
  };

function formatChatTime(timestamp: number) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function parseIncomingChatPayload(rawMessage: string): ParsedChatPayload | null {
  const normalizedMessage = rawMessage.trim();

  if (!normalizedMessage) {
    return null;
  }

  try {
    const parsedPayload = JSON.parse(rawMessage) as {
      type?: unknown;
      content?: unknown;
      stickerKey?: unknown;
    };

    if (parsedPayload.type === "text" && typeof parsedPayload.content === "string") {
      const content = parsedPayload.content.trim();

      return content
        ? {
          type: "text",
          content,
        }
        : null;
    }

    if (parsedPayload.type === "sticker" && typeof parsedPayload.stickerKey === "string") {
      return {
        type: "sticker",
        stickerKey: parsedPayload.stickerKey,
      };
    }

    console.warn("Ignoring unsupported chat payload.", parsedPayload);
    return null;
  } catch {
    return {
      type: "text",
      content: rawMessage,
    };
  }
}

export function serializeOutgoingChatPayload(payload: OutboundChatMessage) {
  if (payload.type === "text") {
    return JSON.stringify({
      type: "text",
      content: payload.content.trim(),
    });
  }

  return JSON.stringify({
    type: "sticker",
    stickerKey: payload.stickerKey,
  });
}

export function mapChatMessageToUiMessage(
  message: LiveKitChatMessage,
  participant: LiveKitParticipant | undefined,
  localDisplayName: string,
  localEmail?: string | null,
  localAvatarUrl?: string | null,
  localIdentity?: string | null,
): ChatMessage | null {
  const parsedPayload = parseIncomingChatPayload(message.message);

  if (!parsedPayload) {
    return null;
  }

  const participantIdentity = participant?.identity || "";
  const isLocal =
    Boolean(participant?.isLocal)
    || Boolean(localIdentity && participantIdentity && participantIdentity === localIdentity);
  const name = isLocal
    ? localDisplayName
    : participant?.name?.trim() || participant?.identity || "Guest";
  const identity = participantIdentity || (isLocal ? localIdentity || "local" : "unknown");
  const avatarSource = isLocal
    ? localEmail?.trim() || identity || name
    : participant?.identity?.trim() || name;
  const avatarUrl = isLocal
    ? localAvatarUrl?.trim() || null
    : getParticipantAvatarFromMetadata(participant?.metadata);

  const baseMessage = {
    id: message.id,
    identity,
    name,
    avatarSource,
    avatarUrl,
    isLocal,
    timestamp: message.timestamp,
    time: formatChatTime(message.timestamp),
    editTimestamp: message.editTimestamp,
  };

  if (parsedPayload.type === "sticker") {
    return {
      ...baseMessage,
      type: "sticker",
      stickerKey: parsedPayload.stickerKey,
    };
  }

  return {
    ...baseMessage,
    type: "text",
    content: parsedPayload.content,
  };
}
