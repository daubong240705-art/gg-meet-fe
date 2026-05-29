"use client";

import { useEffect, useRef, useState } from "react";
import { Hand, MicOff, MoreVertical, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";
import type { MeetingTrackType } from "@/shared/services/meeting.service";
import { MonitorOff } from "lucide-react";

import { AudioTrackView, VideoTrackView } from "./track-view";
import type { Participant } from "../types";

type MutingParticipantTrack = {
  participantId: number;
  trackType: MeetingTrackType;
};

type ParticipantCardProps = {
  participant: Participant;
  compact?: boolean;
  highlighted?: boolean;
  className?: string;
  isLayoutTransitionEnabled?: boolean;
  renderAudio?: boolean;
  renderVideo?: boolean;
  canManageParticipantMedia?: boolean;
  canForceStopScreenShare?: boolean;
  isForceStoppingScreenShare?: boolean;
  mutingParticipantTrack?: MutingParticipantTrack | null;
  onMuteParticipantTrack?: (participant: Participant, trackType: MeetingTrackType) => void;
  onForceStopScreenShare?: (participant: Participant) => void;
};

export default function ParticipantCard({
  participant,
  compact = false,
  highlighted = false,
  className,
  isLayoutTransitionEnabled = true,
  renderAudio = true,
  renderVideo = true,
  canManageParticipantMedia = false,
  canForceStopScreenShare = false,
  isForceStoppingScreenShare = false,
  mutingParticipantTrack,
  onMuteParticipantTrack,
  onForceStopScreenShare,
}: ParticipantCardProps) {
  const isActiveSpeaker = !participant.isMuted && participant.isSpeaking;
  const shouldRenderVideo = renderVideo && !participant.isCameraOff && participant.cameraTrack;
  const canMuteParticipantMedia =
    canManageParticipantMedia && !participant.isLocal && !participant.isHost;
  const isMutingAudio =
    mutingParticipantTrack?.participantId === participant.participantId
    && mutingParticipantTrack.trackType === "AUDIO";
  const isMutingVideo =
    mutingParticipantTrack?.participantId === participant.participantId
    && mutingParticipantTrack.trackType === "VIDEO";
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const canMuteAudio = canMuteParticipantMedia && !participant.isMuted;
  const canMuteVideo = canMuteParticipantMedia && !participant.isCameraOff;
  const canStopScreenShare =
    canForceStopScreenShare && participant.isScreenSharing && !participant.isLocal;
  const hasActionMenu = canMuteAudio || canMuteVideo || canStopScreenShare;

  useEffect(() => {
    if (!isActionMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (actionMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsActionMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsActionMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isActionMenuOpen]);

  const handleMuteTrack = (trackType: MeetingTrackType) => {
    setIsActionMenuOpen(false);
    onMuteParticipantTrack?.(participant, trackType);
  };

  return (
    <Card
      className={cn(
        "group/card relative z-0 aspect-video min-h-32 min-w-0 w-full max-w-full gap-0 overflow-hidden border border-border/70 px-0 py-0 sm:min-h-40 lg:min-h-48",
        "bg-linear-to-br from-card via-card to-muted/60 shadow-sm motion-reduce:transition-none",
        isLayoutTransitionEnabled
          ? "motion-safe:transition-[opacity,border-color,box-shadow,background-color] motion-safe:duration-200 motion-safe:ease-out"
          : "motion-safe:transition-none",
        compact && "min-h-0 sm:min-h-0 lg:min-h-0",
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

      {shouldRenderVideo ? (
        <div className="absolute inset-0 z-0 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 motion-reduce:animate-none">
          <VideoTrackView
            track={participant.cameraTrack}
            muted={participant.isLocal}
            mirrored={participant.isLocal}
          />
        </div>
      ) : null}

      {isActiveSpeaker ? (
        <div className="pointer-events-none absolute inset-0 z-0 rounded-[inherit] border-2 border-primary shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200 motion-reduce:animate-none" />
      ) : null}

      {!shouldRenderVideo ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none">
          <UserAvatar
            avatarUrl={participant.avatarUrl}
            name={participant.name}
            email={participant.avatarSource}
            className={cn(
              "h-20 w-20 text-xl shadow-lg",
              compact && "h-14 w-14 text-base",
            )}
            initialsClassName={compact ? "text-base" : "text-xl"}
          />
        </div>
      ) : null}

      <div className={cn("relative z-20 flex h-full flex-col justify-between", compact ? "p-2" : "p-4")}>
        {renderAudio && !participant.isLocal ? <AudioTrackView track={participant.audioTrack} /> : null}

        <div className="flex items-start justify-between gap-3">
          {participant.isHost ? (
            <div
              className={cn(
                "pointer-events-none rounded-full border border-amber-300/30 bg-amber-400/20 text-amber-50 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none",
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
                  "flex items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/90 text-slate-950 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none",
                  compact ? "h-8 w-8" : "h-9 w-9",
                )}
                title="Raised hand"
              >
                <Hand className={cn(compact ? "h-4 w-4" : "h-4.5 w-4.5")} />
              </div>
            ) : null}

            {hasActionMenu ? (
              <div
                ref={actionMenuRef}
                className={cn(
                  "relative opacity-0 motion-safe:transition-opacity motion-safe:duration-150 group-hover/card:opacity-100 group-focus-within/card:opacity-100",
                  compact && "opacity-100",
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "rounded-full bg-black/40 text-white shadow-sm backdrop-blur-sm hover:bg-black/55 hover:text-white",
                    compact && "size-6",
                  )}
                  title={`Open actions for ${participant.name}`}
                  aria-label={`Open actions for ${participant.name}`}
                  aria-expanded={isActionMenuOpen}
                  onClick={() => setIsActionMenuOpen((currentValue) => !currentValue)}
                >
                  <MoreVertical className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
                </Button>

                {isActionMenuOpen ? (
                  <div className="absolute right-0 top-9 z-30 w-48 overflow-hidden rounded-lg border border-white/10 bg-slate-950/92 p-1 text-white shadow-xl backdrop-blur-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-100 motion-reduce:animate-none">
                    {canMuteAudio ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-red-500/20 hover:text-red-100 disabled:pointer-events-none disabled:opacity-50"
                        disabled={isMutingAudio}
                        onClick={() => handleMuteTrack("AUDIO")}
                      >
                        <MicOff className="h-4 w-4" />
                        Mute microphone
                      </button>
                    ) : null}

                    {canMuteVideo ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-red-500/20 hover:text-red-100 disabled:pointer-events-none disabled:opacity-50"
                        disabled={isMutingVideo}
                        onClick={() => handleMuteTrack("VIDEO")}
                      >
                        <VideoOff className="h-4 w-4" />
                        Turn off camera
                      </button>
                    ) : null}

                    {canStopScreenShare ? (
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-red-500/20 hover:text-red-100 disabled:pointer-events-none disabled:opacity-50"
                        disabled={isForceStoppingScreenShare}
                        onClick={() => {
                          setIsActionMenuOpen(false);
                          onForceStopScreenShare?.(participant);
                        }}
                      >
                        <MonitorOff className="h-4 w-4" />
                        Stop presenting
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : participant.isMuted ? (
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none",
                  compact ? "h-8 w-8" : "h-9 w-9",
                )}
              >
                <MicOff className={cn(compact ? "h-4 w-4" : "h-4.5 w-4.5")} />
              </div>
            ) : null}
          </div>
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
            "pointer-events-none absolute bottom-3 left-3  max-w-[70%] rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-sm motion-safe:transition-[transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none",
            compact ? "bottom-2 left-2 px-2 py-0.5 text-[10px]" : "px-3 py-1.5 text-xs",
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
