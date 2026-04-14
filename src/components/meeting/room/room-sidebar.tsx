"use client";

import { Send } from "lucide-react";
import { MessageSquare, Mic, MicOff, Users, Video, VideoOff } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { ChatMessage, Participant, SidebarPanel, SidebarTab } from "./types";
import { getInitials } from "./utils";

type RoomSidebarProps = {
  activePanel: SidebarPanel;
  participants: Participant[];
  chatMessages: ChatMessage[];
  chatDraft: string;
  isChatReady: boolean;
  isSendingChat: boolean;
  onChatDraftChange: (value: string) => void;
  onSendChatMessage: () => void;
  onPanelChange: (panel: SidebarPanel) => void;
};

export default function RoomSidebar({
  activePanel,
  participants,
  chatMessages,
  chatDraft,
  isChatReady,
  isSendingChat,
  onChatDraftChange,
  onSendChatMessage,
  onPanelChange,
}: RoomSidebarProps) {
  const currentTab: SidebarTab = activePanel ?? "participants";
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

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

  if (!activePanel) {
    return null;
  }

  const handleTabChange = (panel: SidebarTab) => {
    onPanelChange(panel);
  };

  return (
    <aside className="flex h-full w-full shrink-0 lg:w-90">
      <Card className="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden border border-border/70 bg-background/85 px-0 py-0">
        <div className="flex items-center gap-2 border-b border-border/70 p-4">
          <Button
            type="button"
            variant={currentTab === "participants" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => handleTabChange("participants")}
          >
            <Users className="h-4 w-4" />
            Participants ({participants.length})
          </Button>
          <Button
            type="button"
            variant={currentTab === "chat" ? "secondary" : "ghost"}
            size="sm"
            className="flex-1"
            onClick={() => handleTabChange("chat")}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </Button>
        </div>

        {currentTab === "participants" ? (
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/70 p-3"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                  {getInitials(participant.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{participant.name}</p>
                    {participant.isHost ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        Host
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {participant.status}
                  </p>
                </div>

                <div className="flex items-center gap-1 text-muted-foreground">
                  {participant.isMuted ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4 text-emerald-500" />
                  )}
                  {participant.isCameraOff ? (
                    <VideoOff className="h-4 w-4" />
                  ) : (
                    <Video className="h-4 w-4 text-sky-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div ref={chatScrollRef} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
              {chatMessages.length > 0 ? (
                chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={message.isLocal ? "flex justify-end" : "flex justify-start"}
                  >
                    <div className={message.isLocal ? "flex max-w-[82%] min-w-0 justify-end" : "flex max-w-[82%] min-w-0 gap-3"}>
                      {!message.isLocal ? (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {getInitials(message.name)}
                        </div>
                      ) : null}

                      <div className={message.isLocal ? "flex min-w-0 flex-col items-end text-right" : "flex min-w-0 flex-col items-start"}>
                        <div
                          className={message.isLocal ? "mb-1 flex items-baseline justify-end gap-2" : "mb-1 flex items-baseline gap-2"}
                        >
                          <span className="font-medium">{message.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {message.time}
                          </span>
                        </div>
                        <div
                          className={
                            message.isLocal
                              ? "w-fit max-w-full rounded-2xl rounded-tr-md bg-primary px-3 py-3 text-sm leading-6 text-primary-foreground"
                              : "w-fit max-w-full rounded-2xl rounded-tl-md bg-muted px-4 py-3 text-sm leading-6"
                          }
                        >
                          <p className="wrap-break-word">{message.message}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-background/40 px-6 text-center text-sm text-muted-foreground">
                  Messages are only visible during your current session and will disappear once you leave.
                </div>
              )}
            </div>

            <div className="border-t border-border/70 p-4">
              <form
                className="flex items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  onSendChatMessage();
                }}
              >
                <Input
                  value={chatDraft}
                  onChange={(event) => onChatDraftChange(event.target.value)}
                  placeholder={
                    isChatReady
                      ? "Send a message to everyone"
                      : "Chat will be available after LiveKit connects"
                  }
                  disabled={!isChatReady || isSendingChat}
                  className="h-11 rounded-full border-border/70 bg-background/80 px-4"
                />
                <Button
                  type="submit"
                  size="icon-lg"
                  className="rounded-full"
                  disabled={!isChatReady || isSendingChat || !chatDraft.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </Card>
    </aside>
  );
}
