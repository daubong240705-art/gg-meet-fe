"use client";

import { Mic, MicOff, MoreVertical, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { Participant } from "./types";
import { getInitials } from "./utils";

type ParticipantCardProps = {
  participant: Participant;
  compact?: boolean;
  highlighted?: boolean;
};

export default function ParticipantCard({
  participant,
  compact = false,
  highlighted = false,
}: ParticipantCardProps) {
  const initials = getInitials(participant.name);

  return (
    <Card
      className={cn(
        "relative h-full min-h-60 gap-0 overflow-hidden border border-border/70 px-0 py-0",
        "bg-linear-to-br from-card via-card to-muted/60 shadow-sm",
        compact && "min-h-28",
        highlighted && "ring-2 ring-primary/30"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-br",
          participant.isCameraOff
            ? "from-muted via-muted/80 to-background"
            : participant.accentClassName
        )}
      />

      <div className="relative flex h-full flex-col justify-between p-4">
        <div className="flex justify-end">
          {!compact ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="rounded-full bg-black/30 text-white hover:bg-black/45 hover:text-white"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground shadow-lg",
              compact && "h-12 w-12 text-base"
            )}
          >
            {initials}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/45 p-3 text-white backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className={cn("truncate font-medium", compact && "text-sm")}>
                {participant.name}
              </p>
              {!compact ? (
                <p className="text-xs text-white/70">{participant.status}</p>
              ) : null}
            </div>

            <div className="flex items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  participant.isMuted ? "bg-red-500/90" : "bg-emerald-500/90"
                )}
              >
                {participant.isMuted ? (
                  <MicOff className="h-3.5 w-3.5 text-white" />
                ) : (
                  <Mic className="h-3.5 w-3.5 text-white" />
                )}
              </div>

              {participant.isCameraOff ? (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-black/35">
                  <VideoOff className="h-3.5 w-3.5 text-white" />
                </div>
              ) : null}

              {participant.isHost && !compact ? (
                <span className="rounded-full bg-primary/90 px-2 py-1 text-[11px] font-medium text-primary-foreground">
                  Host
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
