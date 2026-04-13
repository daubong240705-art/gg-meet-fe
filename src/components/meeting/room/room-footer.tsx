"use client";

import { Hand, MessageSquare, Mic, MicOff, Monitor, Phone, Users, Video, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { SidebarPanel } from "./types";

type RoomFooterProps = {
  displayName: string;
  participantsCount: number;
  activePanel: SidebarPanel;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onTogglePanel: (panel: Exclude<SidebarPanel, null>) => void;
  onLeave: () => void;
};

export default function RoomFooter({
  displayName,
  participantsCount,
  activePanel,
  isMicEnabled,
  isCameraEnabled,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onTogglePanel,
  onLeave,
}: RoomFooterProps) {
  return (
    <footer className="border-t border-border/60 bg-background/90 px-4 py-4 backdrop-blur lg:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">In call as</p>
          <p className="text-lg font-semibold">{displayName}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant={isMicEnabled ? "secondary" : "destructive"}
            size="icon-lg"
            className="rounded-full"
            onClick={onToggleMic}
          >
            {isMicEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            type="button"
            variant={isCameraEnabled ? "secondary" : "destructive"}
            size="icon-lg"
            className="rounded-full"
            onClick={onToggleCamera}
          >
            {isCameraEnabled ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>

          <Button
            type="button"
            variant={isScreenSharing ? "default" : "secondary"}
            size="icon-lg"
            className="rounded-full"
            onClick={onToggleScreenShare}
          >
            <Monitor className="h-5 w-5" />
          </Button>

          <div className="mx-1 hidden h-8 w-px bg-border/70 sm:block" />

          <Button
            type="button"
            variant={activePanel === "participants" ? "default" : "secondary"}
            size="icon-lg"
            className="relative rounded-full"
            onClick={() => onTogglePanel("participants")}
          >
            <Users className="h-5 w-5" />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
              {participantsCount}
            </span>
          </Button>

          <Button
            type="button"
            variant={activePanel === "chat" ? "default" : "secondary"}
            size="icon-lg"
            className="rounded-full"
            onClick={() => onTogglePanel("chat")}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="icon-lg"
            className="rounded-full"
          >
            <Hand className="h-5 w-5" />
          </Button>
        </div>

        <Button
          type="button"
          variant="destructive"
          size="lg"
          className="h-12 rounded-full px-6"
          onClick={onLeave}
        >
          <Phone className="h-5 w-5" />
          Leave meeting
        </Button>
      </div>
    </footer>
  );
}
