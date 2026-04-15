"use client";

import { Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import ParticipantCard from "./participant-card";
import { VideoTrackView } from "./track-view";
import type { Participant } from "./types";

type RoomStageProps = {
  participants: Participant[];
  screenShareParticipants: Participant[];
  screenShareParticipant: Participant | null;
  isLocalScreenSharing: boolean;
  onSelectScreenShare: (participantId: string) => void;
  onToggleScreenShare: () => void;
};

function getGridContainerClassName(participantCount: number) {
  if (participantCount <= 1) {
    return "grid h-full grid-cols-1 auto-rows-fr";
  }

  if (participantCount === 2) {
    return "grid h-full auto-rows-fr gap-4 sm:grid-cols-2";
  }

  if (participantCount <= 4) {
    return "grid h-full auto-rows-fr gap-4 sm:grid-cols-2";
  }

  if (participantCount <= 6) {
    return "grid h-full auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-3";
  }

  if (participantCount <= 9) {
    return "grid h-full auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3";
  }

  return "grid h-full auto-rows-fr gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";
}

function getGridCardClassName(participantCount: number) {
  if (participantCount <= 1) {
    return "h-full min-h-0 aspect-auto";
  }

  if (participantCount === 2) {
    return "h-full min-h-0 aspect-auto";
  }

  if (participantCount <= 4) {
    return "h-full min-h-0 aspect-auto";
  }

  if (participantCount <= 6) {
    return "h-full min-h-0 aspect-auto";
  }

  return "h-full min-h-0 aspect-auto";
}

function getGridItemClassName(participantCount: number, index: number) {
  if (participantCount === 3 && index === 2) {
    return "md:col-span-2 md:mx-auto md:w-full md:max-w-[calc(50%-0.5rem)]";
  }

  return "";
}

function getScreenShareTabLabel(participant: Participant) {
  return participant.isLocal ? "You" : participant.name;
}

export default function RoomStage({
  participants,
  screenShareParticipants,
  screenShareParticipant,
  isLocalScreenSharing,
  onSelectScreenShare,
  onToggleScreenShare,
}: RoomStageProps) {
  const screenShareParticipantId = screenShareParticipant?.id ?? null;

  if (participants.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center border border-border/70 bg-background/80">
        <p className="px-6 text-center text-sm text-muted-foreground">
          Waiting for participants to join room.
        </p>
      </Card>
    );
  }

  const renderParticipantRail = (railParticipants: Participant[]) => (
    <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden border border-border/70 bg-card/90 px-0 py-0 backdrop-blur-sm">


      <div className="grid min-h-0 flex-1 auto-rows-max content-start gap-3 overflow-y-auto p-3">
        {railParticipants.map((participant) => (
          <ParticipantCard
            key={participant.id}
            participant={participant}
            compact
            highlighted={participant.id === screenShareParticipantId}
          />
        ))}
      </div>
    </Card>
  );

  if (screenShareParticipant) {
    return (
      <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden lg:grid lg:grid-cols-[minmax(0,1fr)_280px] lg:items-stretch">
        <Card className="order-1 relative min-h-72 flex-1 gap-0 overflow-hidden border border-border/70 bg-card/95 px-0 py-0 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.38)] lg:min-h-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_38%),linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98))]" />

          <div className="relative flex h-full min-h-0 flex-col gap-4 p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background/45 px-3 py-1.5 text-xs font-medium text-foreground">
                  <Monitor className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">Presenting</span>
                </div>

                <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {screenShareParticipants.map((participant) => (
                    <button
                      key={participant.id}
                      type="button"
                      onClick={() => onSelectScreenShare(participant.id)}
                      aria-label={`View ${getScreenShareTabLabel(participant)} screen share`}
                      className={cn(
                        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        participant.id === screenShareParticipantId
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-background/45 text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <span className="max-w-28 truncate">
                        {getScreenShareTabLabel(participant)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onToggleScreenShare}
                className="h-9 rounded-full border border-border/70 bg-background/45 px-3 text-foreground hover:bg-muted hover:text-foreground"
              >
                <Monitor className="h-4 w-4" />
                {isLocalScreenSharing ? "Stop sharing" : "Present now"}
              </Button>
            </div>

            <div className="relative mx-auto flex h-full min-h-0 w-full max-w-7xl flex-1 items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-background/70 p-3 shadow-inner shadow-black/20">
              {screenShareParticipant.screenShareTrack ? (
                <VideoTrackView
                  track={screenShareParticipant.screenShareTrack}
                  muted={screenShareParticipant.isLocal}
                  className="object-contain"
                />
              ) : (
                <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-6 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/20">
                    <Monitor className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight">
                      Presentation in progress
                    </h2>
                    <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
                      Waiting for the shared screen track to arrive from LiveKit.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="order-2 min-h-0 lg:h-full">
          {renderParticipantRail(participants)}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto h-full w-full max-w-420 min-h-0 overflow-hidden",
        getGridContainerClassName(participants.length),
      )}
    >
      {participants.map((participant, index) => (
        <div
          key={participant.id}
          className={cn("min-h-0 min-w-0", getGridItemClassName(participants.length, index))}
        >
          <ParticipantCard
            participant={participant}
            highlighted={participant.id === screenShareParticipantId}
            className={getGridCardClassName(participants.length)}
          />
        </div>
      ))}
    </div>
  );
}
