"use client";

import { MessageSquare, Mic, MicOff, Users, Video, VideoOff } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { CHAT_MESSAGES } from "./constants";
import type { Participant, SidebarPanel, SidebarTab } from "./types";
import { getInitials } from "./utils";

type RoomSidebarProps = {
  activePanel: SidebarPanel;
  participants: Participant[];
  onPanelChange: (panel: SidebarPanel) => void;
};

export default function RoomSidebar({
  activePanel,
  participants,
  onPanelChange,
}: RoomSidebarProps) {
  const [currentTab, setCurrentTab] = useState<SidebarTab>("participants");

  useEffect(() => {
    if (activePanel) {
      setCurrentTab(activePanel);
    }
  }, [activePanel]);

  if (!activePanel) {
    return null;
  }

  const handleTabChange = (panel: SidebarTab) => {
    setCurrentTab(panel);
    onPanelChange(panel);
  };

  return (
    <aside className="w-full shrink-0 lg:w-[360px]">
      <Card className="h-full gap-0 overflow-hidden border border-border/70 bg-background/85 px-0 py-0">
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
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
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
          <div className="flex h-full flex-col">
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {CHAT_MESSAGES.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {getInitials(message.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline gap-2">
                      <span className="font-medium">{message.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {message.time}
                      </span>
                    </div>
                    <div className="rounded-2xl bg-muted px-4 py-3 text-sm leading-6">
                      {message.message}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/70 p-4">
              <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                Chat input can be wired here after real-time messaging is ready.
              </div>
            </div>
          </div>
        )}
      </Card>
    </aside>
  );
}
