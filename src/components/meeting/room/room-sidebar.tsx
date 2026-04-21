"use client";

import Image from "next/image";
import {
  Clock3,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  SmilePlus,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";

import { STICKER_OPTIONS, getStickerUrl } from "./chat-stickers";
import type {
  ChatMessage,
  OutboundChatMessage,
  Participant,
  SidebarPanel,
  SidebarTab,
  WaitingParticipant,
} from "./types";
import { getInitials } from "./utils";

type RoomSidebarProps = {
  activePanel: SidebarPanel;
  isOpen?: boolean;
  participants: Participant[];
  waitingParticipants: WaitingParticipant[];
  canManageWaitingRoom: boolean;
  chatMessages: ChatMessage[];
  chatDraft: string;
  isChatReady: boolean;
  isSendingChat: boolean;
  onChatDraftChange: (value: string) => void;
  onSendChatMessage: (payload: OutboundChatMessage) => void;
  onApproveWaitingParticipant: (participant: WaitingParticipant) => void;
  onRejectWaitingParticipant: (participant: WaitingParticipant) => void;
  onApproveAllWaitingParticipants: () => void;
  onPanelChange: (panel: SidebarPanel) => void;
  onClose: () => void;
};

function WaitingParticipantRow({
  participant,
  onApprove,
  onReject,
}: {
  participant: WaitingParticipant;
  onApprove: (participant: WaitingParticipant) => void;
  onReject: (participant: WaitingParticipant) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/55 p-3 backdrop-blur-sm motion-safe:transition-[transform,opacity,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:bg-background/70">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary-foreground">
        {getInitials(participant.name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{participant.name}</p>
        <p className="text-sm text-muted-foreground">Waiting for host approval</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="rounded-full bg-primary px-3 text-primary-foreground hover:bg-primary/90"
          onClick={() => onApprove(participant)}
        >
          Admit
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="rounded-full border border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => onReject(participant)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function RoomSidebar({
  activePanel,
  isOpen = true,
  participants,
  waitingParticipants,
  canManageWaitingRoom,
  chatMessages,
  chatDraft,
  isChatReady,
  isSendingChat,
  onChatDraftChange,
  onSendChatMessage,
  onApproveWaitingParticipant,
  onRejectWaitingParticipant,
  onApproveAllWaitingParticipants,
  onPanelChange,
  onClose,
}: RoomSidebarProps) {
  const currentTab: SidebarTab = activePanel ?? "participants";
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
    if (activePanel !== "chat") {
      return;
    }

    const container = chatScrollRef.current;

    if (!container) {
      return;
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, [activePanel, chatMessages]);

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

  if (!activePanel) {
    return null;
  }

  const handleTabChange = (panel: SidebarTab) => {
    onPanelChange(panel);
  };

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
    <aside className="flex h-full w-full shrink-0 lg:w-96">
      <Card
        className={cn(
          "flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden border border-border/80 bg-card/95 px-0 py-0 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-xl",
          "motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
          isOpen ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3 lg:hidden">
          <div>
            <p className="text-sm font-semibold text-foreground">Meeting panel</p>
            <p className="text-xs text-muted-foreground">
              {currentTab === "participants" ? "Participants and waiting room" : "Chat in this meeting"}
            </p>
          </div>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 border-b border-border/70 p-4">
          <Button
            type="button"
            variant={currentTab === "participants" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 rounded-full border border-transparent text-foreground",
              currentTab === "participants"
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                : "hover:bg-muted hover:text-foreground",
            )}
            onClick={() => handleTabChange("participants")}
          >
            <Users className="h-4 w-4" />
            Participants ({participants.length})
          </Button>
          <Button
            type="button"
            variant={currentTab === "chat" ? "secondary" : "ghost"}
            size="sm"
            className={cn(
              "flex-1 rounded-full border border-transparent text-foreground",
              currentTab === "chat"
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                : "hover:bg-muted hover:text-foreground",
            )}
            onClick={() => handleTabChange("chat")}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </Button>
        </div>

        {currentTab === "participants" ? (
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-150 motion-reduce:animate-none">
            {canManageWaitingRoom ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold  text-muted-foreground">
                      Waiting to Join
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {waitingParticipants.length > 0
                        ? `${waitingParticipants.length} request${waitingParticipants.length > 1 ? "s" : ""} waiting`
                        : "No pending requests right now"}
                    </p>
                  </div>

                  {waitingParticipants.length > 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="rounded-full border border-primary/25 bg-primary/10 px-3 text-primary hover:bg-primary/20 hover:text-primary"
                      onClick={onApproveAllWaitingParticipants}
                    >
                      Admit all
                    </Button>
                  ) : null}
                </div>

                {waitingParticipants.length > 0 ? (
                  <div className="space-y-3">
                    {waitingParticipants.map((participant) => (
                      <WaitingParticipantRow
                        key={participant.participantId}
                        participant={participant}
                        onApprove={onApproveWaitingParticipant}
                        onReject={onRejectWaitingParticipant}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/35 px-4 py-4 text-sm text-muted-foreground">
                    <Clock3 className="h-4 w-4 text-muted-foreground" />
                    No one is waiting for approval.
                  </div>
                )}
              </section>
            ) : null}

            <section className="space-y-3">
              <div>
                <p className="text-xs font-semibold  text-muted-foreground">
                  In the Call
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {participants.length} participant{participants.length > 1 ? "s" : ""} connected
                </p>
              </div>

              <div className="space-y-3">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-3 motion-safe:transition-[transform,opacity,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:bg-background/50"
                  >
                    <UserAvatar
                      avatarUrl={participant.avatarUrl}
                      name={participant.name}
                      email={participant.avatarSource}
                      className="h-11 w-11"
                      initialsClassName="text-sm"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">{participant.name}</p>
                        {participant.isHost ? (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 motion-reduce:animate-none">
                            Host
                          </span>
                        ) : null}
                        {participant.handRaised ? (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] font-medium text-amber-300 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 motion-reduce:animate-none">
                            <Hand className="h-3 w-3" />
                            Raised hand
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{participant.status}</p>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground">
                      {participant.handRaised ? (
                        <Hand className="h-4 w-4 text-amber-300" />
                      ) : null}
                      {participant.isMuted ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4 text-emerald-400" />
                      )}
                      {participant.isCameraOff ? (
                        <VideoOff className="h-4 w-4" />
                      ) : (
                        <Video className="h-4 w-4 text-sky-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : (
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
                                    className="h-24 w-24 object-contain"
                                  />
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">Sticker unavailable</p>
                              );
                            })()
                          ) : (
                            <p className="wrap-break-word whitespace-pre-wrap">{message.content}</p>
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
                    <div className="absolute bottom-full left-0 z-20 mb-3 w-56 rounded-3xl border border-border/80 bg-card/95 p-3 shadow-[0_20px_60px_rgba(2,6,23,0.42)] backdrop-blur-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-reduce:animate-none">
                      <div className="mb-2 px-1 text-xs font-semibold  text-muted-foreground">
                        Stickers
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {STICKER_OPTIONS.map((sticker) => (
                          <button
                            key={sticker.key}
                            type="button"
                            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-background/45 transition hover:border-primary/50 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                            onClick={() => handleStickerSelect(sticker.key)}
                          >
                            <Image
                              src={sticker.url}
                              alt={sticker.key}
                              width={40}
                              height={40}
                              className="h-9 w-9 object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
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
        )}
      </Card>
    </aside>
  );
}
