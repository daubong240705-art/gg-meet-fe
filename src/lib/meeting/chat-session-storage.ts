import type { ChatMessage } from "@/components/meeting/room/types";

const CHAT_MESSAGES_STORAGE_KEY = "meeting-chat-messages";

// Cap stored history so a long meeting cannot overflow the sessionStorage quota.
const MAX_PERSISTED_CHAT_MESSAGES = 300;

const isBrowser = typeof window !== "undefined";

const normalizeMeetingCode = (meetingCode: string) => meetingCode.trim().toLowerCase();

type StoredChatMessages = Record<string, ChatMessage[]>;

const readStoredChatMessages = (): StoredChatMessages => {
  if (!isBrowser) {
    return {};
  }

  try {
    const rawValue = window.sessionStorage.getItem(CHAT_MESSAGES_STORAGE_KEY);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    return typeof parsedValue === "object" && parsedValue !== null
      ? parsedValue as StoredChatMessages
      : {};
  } catch {
    return {};
  }
};

const persistStoredChatMessages = (store: StoredChatMessages) => {
  if (!isBrowser) {
    return;
  }

  if (Object.keys(store).length === 0) {
    window.sessionStorage.removeItem(CHAT_MESSAGES_STORAGE_KEY);
    return;
  }

  try {
    window.sessionStorage.setItem(CHAT_MESSAGES_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota/serialization errors — chat persistence is best-effort.
  }
};

export const readPersistedChatMessages = (meetingCode: string): ChatMessage[] => {
  if (!isBrowser || !meetingCode) {
    return [];
  }

  const messages = readStoredChatMessages()[normalizeMeetingCode(meetingCode)];
  return Array.isArray(messages) ? messages : [];
};

export const persistChatMessages = (meetingCode: string, messages: ChatMessage[]) => {
  if (!isBrowser || !meetingCode) {
    return;
  }

  const store = readStoredChatMessages();
  const normalizedMeetingCode = normalizeMeetingCode(meetingCode);

  if (messages.length === 0) {
    if (!(normalizedMeetingCode in store)) {
      return;
    }

    delete store[normalizedMeetingCode];
  } else {
    store[normalizedMeetingCode] = messages.slice(-MAX_PERSISTED_CHAT_MESSAGES);
  }

  persistStoredChatMessages(store);
};

export const clearPersistedChatMessages = (meetingCode: string) => {
  if (!isBrowser || !meetingCode) {
    return;
  }

  const store = readStoredChatMessages();
  const normalizedMeetingCode = normalizeMeetingCode(meetingCode);

  if (!(normalizedMeetingCode in store)) {
    return;
  }

  delete store[normalizedMeetingCode];
  persistStoredChatMessages(store);
};
