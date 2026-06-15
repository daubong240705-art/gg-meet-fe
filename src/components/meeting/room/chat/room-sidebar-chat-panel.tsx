"use client";

import Image from "next/image";
import { ArrowDown, Send, SmilePlus } from "lucide-react";
import { Fragment, memo, useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";

import { ChatLinkifiedText } from "./chat-linkified-text";
import { getStickerUrl } from "./chat-stickers";
import { RoomSidebarStickerPicker } from "./room-sidebar-sticker-picker";
import type { ChatMessage, OutboundChatMessage, SidebarTab } from "../types";

type RoomSidebarChatPanelProps = {
  currentTab: SidebarTab;
  isOpen: boolean;
  chatMessages: ChatMessage[];
  chatDraft: string;
  isChatReady: boolean;
  isSendingChat: boolean;
  firstUnreadMessageId: string | null;
  onChatDraftChange: (value: string) => void;
  onSendChatMessage: (payload: OutboundChatMessage) => void;
  onClearUnreadDivider: () => void;
};

const AUTO_SCROLL_BOTTOM_THRESHOLD_PX = 80;
const MESSAGE_GROUP_WINDOW_MS = 5 * 60 * 1000;

function isScrolledNearBottom(container: HTMLDivElement) {
  return container.scrollHeight - container.scrollTop - container.clientHeight <= AUTO_SCROLL_BOTTOM_THRESHOLD_PX;
}

type ChatMessageItemProps = {
  message: ChatMessage;
  isGroupedWithPrevious: boolean;
  isFirstMessage: boolean;
};

function shouldGroupWithPrevious(message: ChatMessage, previousMessage: ChatMessage | null) {
  if (!previousMessage || previousMessage.identity !== message.identity) {
    return false;
  }

  const timeDelta = message.timestamp - previousMessage.timestamp;

  return timeDelta >= 0 && timeDelta < MESSAGE_GROUP_WINDOW_MS;
}

const ChatMessageItem = memo(function ChatMessageItem({
  message,
  isGroupedWithPrevious,
  isFirstMessage,
}: ChatMessageItemProps) {
  const stickerUrl = message.type === "sticker" ? getStickerUrl(message.stickerKey) : null;
  const shouldShowSenderMeta = !isGroupedWithPrevious;

  return (
    <div
      className={cn(
        message.isLocal ? "flex w-full justify-end" : "flex w-full justify-start",
        isFirstMessage ? "mt-0" : isGroupedWithPrevious ? "mt-1" : "mt-4",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-reduce:animate-none",
      )}
    >
      <div className={message.isLocal ? "ml-auto flex w-fit max-w-[82%] min-w-0 justify-end" : "mr-auto flex w-fit max-w-[82%] min-w-0 gap-3"}>
        {!message.isLocal && shouldShowSenderMeta ? (
          <UserAvatar
            avatarUrl={message.avatarUrl}
            name={message.name}
            email={message.avatarSource}
            className="h-9 w-9 text-sm"
            initialsClassName="text-sm"
          />
        ) : !message.isLocal ? (
          <div className="h-9 w-9 shrink-0" aria-hidden="true" />
        ) : null}

        <div className={message.isLocal ? "flex min-w-0 flex-col items-end" : "flex min-w-0 flex-col items-start"}>
          {shouldShowSenderMeta ? (
            <div
              className={message.isLocal ? "mb-1 flex items-baseline justify-end gap-2" : "mb-1 flex items-baseline gap-2"}
            >
              <span className="font-medium text-foreground">{message.name}</span>
              <span className="text-xs text-muted-foreground">
                {message.time}
              </span>
            </div>
          ) : null}
          <div
            aria-label={`${message.name}, ${message.time}`}
            className={
              message.type === "sticker"
                ? "w-fit max-w-full"
                : message.isLocal
                  ? "ml-auto w-fit max-w-full self-end rounded-2xl rounded-tr-md bg-primary px-3 py-3 text-left text-sm leading-6 text-primary-foreground"
                  : "w-fit max-w-full rounded-2xl rounded-tl-md border border-border/70 bg-background/55 px-4 py-3 text-sm leading-6 text-foreground"
            }
          >
            {message.type === "sticker" ? (
              stickerUrl ? (
                <div className="rounded-[1.1rem] shadow-[0_8px_24px_rgba(2,6,23,0.18)]">
                  <Image
                    src={stickerUrl}
                    alt={`${message.name} sticker`}
                    width={108}
                    height={108}
                    unoptimized
                    sizes="96px"
                    className="h-24 w-24 object-contain"
                  />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sticker unavailable</p>
              )
            ) : (
              <ChatLinkifiedText text={message.content} isLocal={message.isLocal} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export function RoomSidebarChatPanel({
  currentTab,
  isOpen,
  chatMessages,
  chatDraft,
  isChatReady,
  isSendingChat,
  firstUnreadMessageId,
  onChatDraftChange,
  onSendChatMessage,
  onClearUnreadDivider,
}: RoomSidebarChatPanelProps) {
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const stickerPickerRef = useRef<HTMLDivElement | null>(null);
  const unreadDividerRef = useRef<HTMLDivElement | null>(null);
  const isNearChatBottomRef = useRef(true);
  const isScrollingToUnreadDividerRef = useRef(false);
  const previousMessageCountRef = useRef(chatMessages.length);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [isNearChatBottom, setIsNearChatBottom] = useState(true);
  const [newMessagesBelowCount, setNewMessagesBelowCount] = useState(0);
  const [visibleUnreadMessageId, setVisibleUnreadMessageId] = useState<string | null>(null);
  const activeUnreadMessageId = visibleUnreadMessageId ?? firstUnreadMessageId;

  const clearUnreadDividerState = useCallback(() => {
    setVisibleUnreadMessageId(null);
    onClearUnreadDivider();
  }, [onClearUnreadDivider]);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = chatScrollRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
    isNearChatBottomRef.current = true;
    setIsNearChatBottom(true);
    setNewMessagesBelowCount(0);
    clearUnreadDividerState();
  }, [clearUnreadDividerState]);

  const focusChatInput = useCallback(() => {
    if (currentTab !== "chat" || !isChatReady) {
      return;
    }

    window.requestAnimationFrame(() => {
      chatInputRef.current?.focus();
    });
  }, [currentTab, isChatReady]);

  const handleChatScroll = useCallback(() => {
    const container = chatScrollRef.current;

    if (!container) {
      return;
    }

    const isNearBottom = isScrolledNearBottom(container);
    isNearChatBottomRef.current = isNearBottom;
    setIsNearChatBottom(isNearBottom);

    if (isNearBottom) {
      setNewMessagesBelowCount(0);

      if (!isScrollingToUnreadDividerRef.current) {
        clearUnreadDividerState();
      }
    }
  }, [clearUnreadDividerState]);

  useEffect(() => {
    const container = chatScrollRef.current;
    const previousMessageCount = previousMessageCountRef.current;
    const addedMessageCount = Math.max(0, chatMessages.length - previousMessageCount);
    previousMessageCountRef.current = chatMessages.length;

    if (!container) {
      return;
    }

    if (isNearChatBottomRef.current && !activeUnreadMessageId) {
      const frameId = window.requestAnimationFrame(() => {
        scrollChatToBottom("smooth");
      });

      return () => {
        window.cancelAnimationFrame(frameId);
      };
    }

    if (currentTab === "chat" && isOpen && addedMessageCount > 0) {
      window.requestAnimationFrame(() => {
        setNewMessagesBelowCount((currentCount) => currentCount + addedMessageCount);
      });
    }
  }, [activeUnreadMessageId, chatMessages.length, currentTab, isOpen, scrollChatToBottom]);

  useEffect(() => {
    if (currentTab !== "chat" || !isOpen || !firstUnreadMessageId) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setVisibleUnreadMessageId(firstUnreadMessageId);
      onClearUnreadDivider();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [currentTab, firstUnreadMessageId, isOpen, onClearUnreadDivider]);

  useEffect(() => {
    if (currentTab !== "chat" || !isOpen || !activeUnreadMessageId) {
      return;
    }

    let clearAutoScrollFlagTimeoutId: number | null = null;
    const frameId = window.requestAnimationFrame(() => {
      isScrollingToUnreadDividerRef.current = true;
      unreadDividerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      const container = chatScrollRef.current;

      if (!container) {
        return;
      }

      const isNearBottom = isScrolledNearBottom(container);
      isNearChatBottomRef.current = isNearBottom;
      setIsNearChatBottom(isNearBottom);

      clearAutoScrollFlagTimeoutId = window.setTimeout(() => {
        isScrollingToUnreadDividerRef.current = false;
      }, 600);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      if (clearAutoScrollFlagTimeoutId !== null) {
        window.clearTimeout(clearAutoScrollFlagTimeoutId);
      }
      isScrollingToUnreadDividerRef.current = false;
    };
  }, [activeUnreadMessageId, currentTab, isOpen]);

  useEffect(() => {
    if (currentTab !== "chat" || !isOpen || !isChatReady || isSendingChat) {
      return;
    }

    focusChatInput();
  }, [currentTab, focusChatInput, isChatReady, isOpen, isSendingChat]);

  useEffect(() => {
    const input = chatInputRef.current;

    if (!input) {
      return;
    }

    input.style.height = "0px";
    input.style.height = `${Math.min(input.scrollHeight, 112)}px`;
  }, [chatDraft]);

  useEffect(() => {
    if (!isStickerPickerOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (stickerPickerRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsStickerPickerOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsStickerPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isStickerPickerOpen]);

  const handleSendTextMessage = () => {
    if (!chatDraft.trim()) {
      focusChatInput();
      return;
    }

    onSendChatMessage({
      type: "text",
      content: chatDraft,
    });
    focusChatInput();
  };

  const handleStickerSelect = (stickerKey: string) => {
    onSendChatMessage({
      type: "sticker",
      stickerKey,
    });
    setIsStickerPickerOpen(false);
    focusChatInput();
  };
  const shouldShowNewMessagesButton =
    currentTab === "chat" && isOpen && newMessagesBelowCount > 0 && !isNearChatBottom;

  return (
    <div className="flex min-h-0 flex-1 flex-col motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-150 motion-reduce:animate-none">
      <div className="relative min-h-0 flex-1">
        <div
          ref={chatScrollRef}
          className="flex h-full min-h-0 flex-col overflow-y-auto p-4"
          onScroll={handleChatScroll}
        >
          {chatMessages.length > 0 ? (
            chatMessages.map((message, index) => {
              const previousMessage = index > 0 ? chatMessages[index - 1] : null;
              const shouldRenderUnreadDivider = activeUnreadMessageId === message.id;
              const isGroupedWithPrevious =
                !shouldRenderUnreadDivider && shouldGroupWithPrevious(message, previousMessage);

              return (
                <Fragment key={message.id}>
                  {shouldRenderUnreadDivider ? (
                    <div
                      ref={unreadDividerRef}
                      className={cn(
                        "flex items-center gap-3 text-xs font-medium text-muted-foreground",
                        index === 0 ? "mt-0" : "mt-5",
                      )}
                    >
                      <span className="h-px flex-1 bg-border/80" />
                      <span className="rounded-full border border-border/70 bg-background/85 px-3 py-1">
                        Unread messages
                      </span>
                      <span className="h-px flex-1 bg-border/80" />
                    </div>
                  ) : null}
                  <ChatMessageItem
                    message={message}
                    isGroupedWithPrevious={isGroupedWithPrevious}
                    isFirstMessage={index === 0 && !shouldRenderUnreadDivider}
                  />
                </Fragment>
              );
            })
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-background/35 px-6 text-center text-sm text-muted-foreground">
              Messages are only visible during your current session and will disappear once you leave.
            </div>
          )}
        </div>

        {shouldShowNewMessagesButton ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
            <Button
              type="button"
              size="sm"
              className="pointer-events-auto h-8 rounded-full px-3 text-xs shadow-lg"
              onClick={() => scrollChatToBottom("smooth")}
            >
              <ArrowDown className="h-3.5 w-3.5" />
              {newMessagesBelowCount === 1
                ? "New message"
                : `${newMessagesBelowCount} new messages`}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="border-t border-border/70 p-4">
        <form
          className="grid grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSendTextMessage();
          }}
        >
          <div className="relative flex-1" ref={stickerPickerRef}>
            {isStickerPickerOpen ? (
              <RoomSidebarStickerPicker onSelect={handleStickerSelect} />
            ) : null}

            <div className="flex min-h-[3.5rem] items-center gap-2 rounded-[1.75rem] border border-border/70 bg-background/55 px-4 py-2">
              <textarea
                ref={chatInputRef}
                value={chatDraft}
                onChange={(event) => onChatDraftChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSendTextMessage();
                  }
                }}
                placeholder={
                  isChatReady
                    ? "Send a message to everyone"
                    : "Chat will be available after LiveKit connects"
                }
                disabled={!isChatReady || isSendingChat}
                rows={1}
                className="max-h-28 min-h-6 w-full resize-none overflow-y-auto bg-transparent py-1 pr-1 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground [scrollbar-color:rgba(148,163,184,0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-track]:bg-transparent"
              />

              <div className="flex shrink-0 items-center">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  disabled={!isChatReady || isSendingChat}
                  onClick={() => setIsStickerPickerOpen((currentValue) => !currentValue)}
                >
                  <SmilePlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            className="h-11 w-11 shrink-0 rounded-full text-primary hover:bg-transparent hover:text-primary/80"
            disabled={!isChatReady || isSendingChat || !chatDraft.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
