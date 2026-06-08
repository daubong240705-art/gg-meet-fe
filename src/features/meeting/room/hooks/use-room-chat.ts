"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ChatMessage as LiveKitChatMessage,
  Participant as LiveKitParticipant,
  Room as LiveKitRoom,
} from "livekit-client";

import { isStickerKey } from "@/components/meeting/room/chat/chat-stickers";
import type {
  ChatMessage,
  OutboundChatMessage,
  SidebarPanel,
} from "@/components/meeting/room/types";
import {
  mapChatMessageToUiMessage,
  serializeOutgoingChatPayload,
} from "@/features/meeting/room/lib";
import {
  persistChatMessages,
  readPersistedChatMessages,
} from "@/lib/meeting/chat-session-storage";

type UseRoomChatParams = {
  meetingCode: string;
  roomRef: { current: LiveKitRoom | null };
  activePanelRef: { current: SidebarPanel };
  isLiveKitEnabled: boolean;
  displayName: string;
  localEmail: string | null;
  localAvatarUrl: string | null;
  onError: (message: string) => void;
};

function insertChatMessageByTimestamp(
  messages: ChatMessage[],
  nextMessage: ChatMessage,
) {
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage || nextMessage.timestamp >= lastMessage.timestamp) {
    return [...messages, nextMessage];
  }

  let low = 0;
  let high = messages.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (messages[middle].timestamp <= nextMessage.timestamp) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return [
    ...messages.slice(0, low),
    nextMessage,
    ...messages.slice(low),
  ];
}

function upsertChatMessage(
  messages: ChatMessage[],
  nextMessage: ChatMessage,
) {
  const existingMessageIndex = messages.findIndex(
    (currentMessage) => currentMessage.id === nextMessage.id,
  );

  if (existingMessageIndex < 0) {
    return insertChatMessageByTimestamp(messages, nextMessage);
  }

  if (messages[existingMessageIndex].timestamp === nextMessage.timestamp) {
    const updatedMessages = [...messages];
    updatedMessages[existingMessageIndex] = nextMessage;
    return updatedMessages;
  }

  return insertChatMessageByTimestamp(
    messages.filter((currentMessage) => currentMessage.id !== nextMessage.id),
    nextMessage,
  );
}

export function useRoomChat({
  meetingCode,
  roomRef,
  activePanelRef,
  isLiveKitEnabled,
  displayName,
  localEmail,
  localAvatarUrl,
  onError,
}: UseRoomChatParams) {
  // Restore the local chat history persisted for this meeting so a page refresh
  // does not wipe messages that LiveKit will not replay.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(
    () => readPersistedChatMessages(meetingCode),
  );
  const seenChatMessageIdsRef = useRef<Set<string>>(new Set());
  const [chatDraft, setChatDraft] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);

  // Seed the dedupe set from the restored history so it is not re-counted as
  // unread. Runs before LiveKit (which connects asynchronously) delivers any
  // message.
  useEffect(() => {
    for (const message of readPersistedChatMessages(meetingCode)) {
      seenChatMessageIdsRef.current.add(message.id);
    }
  }, [meetingCode]);

  useEffect(() => {
    persistChatMessages(meetingCode, chatMessages);
  }, [meetingCode, chatMessages]);

  // LiveKit fires onReset on every (re)connect. Keep the restored/in-session
  // history intact and only clear the unread badge; the explicit leave/end flow
  // clears the persisted store.
  const resetChat = useCallback(() => {
    setUnreadChatCount(0);
  }, []);

  const clearUnreadChatCount = useCallback(() => {
    setUnreadChatCount(0);
  }, []);

  const clearUnreadDivider = useCallback(() => {
    setFirstUnreadMessageId(null);
  }, []);

  const handleLiveKitChatMessage = useCallback((
    message: LiveKitChatMessage,
    participant: LiveKitParticipant | undefined,
    room: LiveKitRoom,
  ) => {
    const nextMessage = mapChatMessageToUiMessage(
      message,
      participant,
      displayName,
      localEmail,
      localAvatarUrl,
      room.localParticipant.identity,
    );

    if (!nextMessage) {
      return;
    }

    const isExistingMessage = seenChatMessageIdsRef.current.has(nextMessage.id);

    if (!isExistingMessage) {
      seenChatMessageIdsRef.current.add(nextMessage.id);

      if (!nextMessage.isLocal && activePanelRef.current !== "chat") {
        setUnreadChatCount((currentCount) => currentCount + 1);
        setFirstUnreadMessageId((currentMessageId) => currentMessageId ?? nextMessage.id);
      }
    }

    setChatMessages((currentMessages) => {
      return upsertChatMessage(currentMessages, nextMessage);
    });
  }, [activePanelRef, displayName, localAvatarUrl, localEmail]);

  const handleSendChatMessage = useCallback((payload: OutboundChatMessage) => {
    if (payload.type === "text" && !payload.content.trim()) {
      return;
    }

    if (payload.type === "sticker" && !isStickerKey(payload.stickerKey)) {
      return;
    }

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      onError("Connect to the LiveKit room before sending messages.");
      return;
    }

    setIsSendingChat(true);

    void room.localParticipant.sendChatMessage(serializeOutgoingChatPayload(payload)).then(() => {
      if (payload.type === "text") {
        setChatDraft("");
      }
    }).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to send chat message.";

      onError(errorMessage);
    }).finally(() => {
      setIsSendingChat(false);
    });
  }, [isLiveKitEnabled, onError, roomRef]);

  return {
    chatMessages,
    chatDraft,
    isSendingChat,
    unreadChatCount,
    firstUnreadMessageId,
    setChatDraft,
    resetChat,
    clearUnreadChatCount,
    clearUnreadDivider,
    handleLiveKitChatMessage,
    handleSendChatMessage,
  };
}
