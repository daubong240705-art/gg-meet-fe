"use client";

import Image from "next/image";
import { Send, SmilePlus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  onChatDraftChange: (value: string) => void;
  onSendChatMessage: (payload: OutboundChatMessage) => void;
};

export function RoomSidebarChatPanel({
  currentTab,
  isOpen,
  chatMessages,
  chatDraft,
  isChatReady,
  isSendingChat,
  onChatDraftChange,
  onSendChatMessage,
}: RoomSidebarChatPanelProps) {
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);
  const stickerPickerRef = useRef<HTMLDivElement | null>(null);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);

  const focusChatInput = useCallback(() => {
    if (currentTab !== "chat" || !isChatReady) {
      return;
    }

    window.requestAnimationFrame(() => {
      chatInputRef.current?.focus();
    });
  }, [currentTab, isChatReady]);

  useEffect(() => {
    const container = chatScrollRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [chatMessages]);

  useEffect(() => {
    if (currentTab !== "chat" || !isOpen || !isChatReady || isSendingChat) {
      return;
    }

    focusChatInput();
  }, [currentTab, focusChatInput, isChatReady, isOpen, isSendingChat]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-150 motion-reduce:animate-none">
      <div ref={chatScrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
        {chatMessages.length > 0 ? (
          chatMessages.map((message) => (
            <div
              key={message.id}
              className={cn(
                message.isLocal ? "flex w-full justify-end" : "flex w-full justify-start",
                "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-200 motion-reduce:animate-none",
              )}
            >
              <div className={message.isLocal ? "ml-auto flex w-fit max-w-[82%] min-w-0 justify-end" : "mr-auto flex w-fit max-w-[82%] min-w-0 gap-3"}>
                {!message.isLocal ? (
                  <UserAvatar
                    avatarUrl={message.avatarUrl}
                    name={message.name}
                    email={message.avatarSource}
                    className="h-9 w-9 text-sm"
                    initialsClassName="text-sm"
                  />
                ) : null}

                <div className={message.isLocal ? "flex min-w-0 flex-col items-end" : "flex min-w-0 flex-col items-start"}>
                  <div
                    className={message.isLocal ? "mb-1 flex items-baseline justify-end gap-2" : "mb-1 flex items-baseline gap-2"}
                  >
                    <span className="font-medium text-foreground">{message.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {message.time}
                    </span>
                  </div>
                  <div
                    className={
                      message.type === "sticker"
                        ? "w-fit max-w-full"
                        : message.isLocal
                          ? "ml-auto w-fit max-w-full self-end rounded-2xl rounded-tr-md bg-primary px-3 py-3 text-left text-sm leading-6 text-primary-foreground"
                          : "w-fit max-w-full rounded-2xl rounded-tl-md border border-border/70 bg-background/55 px-4 py-3 text-sm leading-6 text-foreground"
                    }
                  >
                    {message.type === "sticker" ? (
                      (() => {
                        const stickerUrl = getStickerUrl(message.stickerKey);

                        return stickerUrl ? (
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
                        );
                      })()
                    ) : (
                      <ChatLinkifiedText text={message.content} isLocal={message.isLocal} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-background/35 px-6 text-center text-sm text-muted-foreground">
            Messages are only visible during your current session and will disappear once you leave.
          </div>
        )}
      </div>

      <div className="border-t border-border/70 p-4">
        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleSendTextMessage();
          }}
        >
          <div className="relative flex-1" ref={stickerPickerRef}>
            {isStickerPickerOpen ? (
              <RoomSidebarStickerPicker onSelect={handleStickerSelect} />
            ) : null}

            <div className="flex min-h-[3.5rem] items-center gap-1 rounded-[1.75rem] border border-border/70 bg-background/55 px-4 py-2">
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
                className="min-h-[2rem] max-h-28 w-full resize-none bg-transparent leading-8 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />

              <div className="flex items-center justify-between gap-2">
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
            className="h-11 w-11 shrink-0 self-end rounded-full text-primary hover:bg-transparent hover:text-primary/80"
            disabled={!isChatReady || isSendingChat || !chatDraft.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
