"use client";

import { Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import ParticipantCard from "./participant-card";
import { VideoTrackView } from "./track-view";
import type { Participant, ViewMode } from "./types";

type RoomStageProps = {
  participants: Participant[];
  viewMode: ViewMode;
  screenShareParticipant: Participant | null;
  onToggleScreenShare: () => void;
};

export default function RoomStage({
  participants,
  viewMode,
  screenShareParticipant,
  onToggleScreenShare,
}: RoomStageProps) {
  const screenShareParticipantId = screenShareParticipant?.id ?? null;

  if (participants.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center border border-border/70 bg-background/80">
        <p className="px-6 text-center text-sm text-muted-foreground">
          Waiting for participants to join the LiveKit room.
        </p>
      </Card>
    );
  }

  const activeSpeaker =
    screenShareParticipant ||
    participants.find((participant) => participant.isSpeaking && !participant.isMuted) ||
    participants[0];

  const thumbnailParticipants = participants.filter(
    (participant) => participant.id !== activeSpeaker.id
  );

  if (screenShareParticipant) {
    return (
      <div className="flex h-full flex-col gap-4">
        <Card className="relative flex-1 gap-0 overflow-hidden border border-slate-800 bg-slate-950 px-0 py-0 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,1))]" />

          <div className="relative flex h-full flex-col justify-between p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                {screenShareParticipant.isLocal
                  ? "You are presenting"
                  : `${screenShareParticipant.name} is presenting`}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={onToggleScreenShare}
                className="bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Monitor className="h-4 w-4" />
                {screenShareParticipant.isLocal ? "Stop sharing" : "Present now"}
              </Button>
            </div>

            <div className="relative mx-auto flex h-full w-full max-w-6xl flex-1 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-black/40 py-6">
              {screenShareParticipant.screenShareTrack ? (
                <VideoTrackView
                  track={screenShareParticipant.screenShareTrack}
                  muted={screenShareParticipant.isLocal}
                  className="object-contain"
                />
              ) : (
                <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/20">
                    <Monitor className="h-12 w-12 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-semibold tracking-tight">
                      Presentation in progress
                    </h2>
                    <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                      Waiting for the shared screen track to arrive from LiveKit.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {participants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              compact
              highlighted={participant.id === screenShareParticipantId}
            />
          ))}
        </div>
      </div>
    );
  }

  if (viewMode === "speaker") {
    return (
      <div className="flex h-full flex-col gap-4">
        <ParticipantCard participant={activeSpeaker} highlighted />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {thumbnailParticipants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              compact
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {participants.map((participant) => (
        <ParticipantCard
          key={participant.id}
          participant={participant}
          highlighted={participant.id === screenShareParticipantId}
        />
      ))}
    </div>
  );
}
