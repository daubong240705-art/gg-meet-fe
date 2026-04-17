"use client";

import { Hand, MicOff, MoreVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { AudioTrackView, VideoTrackView } from "./track-view";
import type { Participant } from "./types";
import { getInitials } from "./utils";

type ParticipantCardProps = {
  participant: Participant;
  compact?: boolean;
  highlighted?: boolean;
  className?: string;
};

export default function ParticipantCard({
  participant,
  compact = false,
  highlighted = false,
  className,
}: ParticipantCardProps) {
  const initials = getInitials(participant.name);
  const isActiveSpeaker = !participant.isMuted && participant.isSpeaking;

  return (
    <Card
      className={cn(
        "relative z-0 w-full aspect-video min-h-32 gap-0 overflow-hidden border border-border/70 px-0 py-0 sm:min-h-40 lg:min-h-48",
        "bg-linear-to-br from-card via-card to-muted/60 shadow-sm",
        compact && "min-h-24 sm:min-h-32",
        isActiveSpeaker && "border-primary/90 shadow-[0_12px_32px_rgba(59,130,246,0.18)]",
        participant.handRaised && !isActiveSpeaker && "border-amber-300/55 shadow-[0_10px_24px_rgba(251,191,36,0.12)]",
        highlighted && !isActiveSpeaker && "ring-2 ring-primary/30",
        className,
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

      {!participant.isCameraOff && participant.cameraTrack ? (
        <div className="absolute inset-0 z-0">
          <VideoTrackView
            track={participant.cameraTrack}
            muted={participant.isLocal}
            mirrored={participant.isLocal}
          />
        </div>
      ) : null}

      {isActiveSpeaker ? (
        <div className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] border-2 border-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" />
      ) : null}

      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        {!participant.isLocal ? <AudioTrackView track={participant.audioTrack} /> : null}

        <div className="flex items-start justify-between gap-3">
          {participant.isHost ? (
            <div
              className={cn(
                "pointer-events-none rounded-full border border-amber-300/30 bg-amber-400/20 text-amber-50 backdrop-blur-sm",
                compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]",
              )}
            >
              <span className="font-medium">Host</span>
            </div>
          ) : (
            <div />
          )}

          <div className="flex flex-col items-end gap-2">
            {participant.handRaised ? (
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/90 text-slate-950 shadow-sm",
                  compact ? "h-8 w-8" : "h-9 w-9",
                )}
                title="Raised hand"
              >
                <Hand className={cn(compact ? "h-4 w-4" : "h-4.5 w-4.5")} />
              </div>
            ) : null}

            {participant.isMuted ? (
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-sm",
                  compact ? "h-8 w-8" : "h-9 w-9",
                )}
              >
                <MicOff className={cn(compact ? "h-4 w-4" : "h-4.5 w-4.5")} />
              </div>
            ) : !compact && !participant.handRaised ? (
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
        </div>

        <div className="flex flex-1 items-center justify-center">
          {participant.isCameraOff || !participant.cameraTrack ? (
            <div
              className={cn(
                "flex h-20 w-20 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground shadow-lg",
                compact && "h-14 w-14 text-base"
              )}
            >
              {initials}
            </div>
          ) : null}
        </div>

        {/* <div className="rounded-xl border border-white/10 bg-black/45 p-3 text-white backdrop-blur-sm">
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
        </div> */}

        <div
          className={cn(
            "pointer-events-none absolute bottom-3 left-3  max-w-[70%] rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-sm",
            compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-xs",
          )}
        >
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium">{participant.name}</p>
            {participant.handRaised ? (
              <Hand className="h-3.5 w-3.5 shrink-0 text-amber-300" />
            ) : null}
          </div>
        </div>
      </div>
    </Card>
  );
}
