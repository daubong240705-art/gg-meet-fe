"use client";

import { useCallback, useRef, useState } from "react";
import {
  type ChatMessage as LiveKitChatMessage,
  Participant as LiveKitParticipant,
  Room as LiveKitRoom,
} from "livekit-client";

import { isStickerKey } from "@/components/meeting/room/chat-stickers";
import type {
  ChatMessage,
  OutboundChatMessage,
  SidebarPanel,
} from "@/components/meeting/room/types";
import {
  mapChatMessageToUiMessage,
  serializeOutgoingChatPayload,
} from "@/features/meeting/room/lib";

type UseRoomChatParams = {
  roomRef: { current: LiveKitRoom | null };
  activePanelRef: { current: SidebarPanel };
  isLiveKitEnabled: boolean;
  displayName: string;
  localEmail: string | null;
  localAvatarUrl: string | null;
  onError: (message: string) => void;
};

export function useRoomChat({
  roomRef,
  activePanelRef,
  isLiveKitEnabled,
  displayName,
  localEmail,
  localAvatarUrl,
  onError,
}: UseRoomChatParams) {
  const seenChatMessageIdsRef = useRef<Set<string>>(new Set());
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatDraft, setChatDraft] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const resetChat = useCallback(() => {
    setChatMessages([]);
    setUnreadChatCount(0);
    seenChatMessageIdsRef.current = new Set();
  }, []);

  const clearUnreadChatCount = useCallback(() => {
    setUnreadChatCount(0);
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
      }
    }

    setChatMessages((currentMessages) => {
      const existingMessageIndex = currentMessages.findIndex(
        (currentMessage) => currentMessage.id === nextMessage.id,
      );

      if (existingMessageIndex >= 0) {
        const updatedMessages = [...currentMessages];
        updatedMessages[existingMessageIndex] = nextMessage;
        return updatedMessages.sort((left, right) => left.timestamp - right.timestamp);
      }

      return [...currentMessages, nextMessage].sort(
        (left, right) => left.timestamp - right.timestamp,
      );
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
    setChatDraft,
    resetChat,
    clearUnreadChatCount,
    handleLiveKitChatMessage,
    handleSendChatMessage,
  };
}
