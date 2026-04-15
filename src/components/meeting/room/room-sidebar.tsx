"use client";

import { Clock3, MessageSquare, Mic, MicOff, Send, Users, Video, VideoOff, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import type {
  ChatMessage,
  Participant,
  SidebarPanel,
  SidebarTab,
  WaitingParticipant,
} from "./types";
import { getInitials } from "./utils";

type RoomSidebarProps = {
  activePanel: SidebarPanel;
  participants: Participant[];
  waitingParticipants: WaitingParticipant[];
  canManageWaitingRoom: boolean;
  chatMessages: ChatMessage[];
  chatDraft: string;
  isChatReady: boolean;
  isSendingChat: boolean;
  onChatDraftChange: (value: string) => void;
  onSendChatMessage: () => void;
  onApproveWaitingParticipant: (participant: WaitingParticipant) => void;
  onRejectWaitingParticipant: (participant: WaitingParticipant) => void;
  onApproveAllWaitingParticipants: () => void;
  onPanelChange: (panel: SidebarPanel) => void;
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
    <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/55 p-3 backdrop-blur-sm">
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
    <aside className="flex h-full w-full shrink-0 lg:w-96">
      <Card className="flex h-full min-h-0 flex-1 flex-col gap-0 overflow-hidden border border-border/80 bg-card/95 px-0 py-0 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.42)] backdrop-blur-xl">
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
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4">
            {canManageWaitingRoom ? (
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-3"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                      {getInitials(participant.name)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-foreground">{participant.name}</p>
                        {participant.isHost ? (
                          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                            Host
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{participant.status}</p>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground">
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
                          <span className="font-medium text-foreground">{message.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {message.time}
                          </span>
                        </div>
                        <div
                          className={
                            message.isLocal
                              ? "w-fit max-w-full rounded-2xl rounded-tr-md bg-primary px-3 py-3 text-sm leading-6 text-primary-foreground"
                              : "w-fit max-w-full rounded-2xl rounded-tl-md border border-border/70 bg-background/55 px-4 py-3 text-sm leading-6 text-foreground"
                          }
                        >
                          <p className="wrap-break-word">{message.message}</p>
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
                  className="h-11 rounded-full border-border/70 bg-background/55 px-4 text-foreground placeholder:text-muted-foreground"
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
