"use client";

import { Monitor } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import ParticipantCard from "./participant-card";
import type { Participant, ViewMode } from "./types";

type RoomStageProps = {
  participants: Participant[];
  viewMode: ViewMode;
  screenShareOwner: string | null;
  displayName: string;
  onToggleScreenShare: () => void;
};

export default function RoomStage({
  participants,
  viewMode,
  screenShareOwner,
  displayName,
  onToggleScreenShare,
}: RoomStageProps) {
  const activeSpeaker =
    participants.find((participant) => participant.name === screenShareOwner) ||
    participants.find((participant) => participant.isSpeaking && !participant.isMuted) ||
    participants[0];

  const thumbnailParticipants = participants.filter(
    (participant) => participant.id !== activeSpeaker.id
  );

  if (screenShareOwner) {
    return (
      <div className="flex h-full flex-col gap-4">
        <Card className="relative flex-1 gap-0 overflow-hidden border border-slate-800 bg-slate-950 px-0 py-0 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.18),transparent_40%),linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,1))]" />

          <div className="relative flex h-full flex-col justify-between p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm">
                {screenShareOwner === displayName
                  ? "You are presenting"
                  : `${screenShareOwner} is presenting`}
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={onToggleScreenShare}
                className="bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Monitor className="h-4 w-4" />
                Stop sharing
              </Button>
            </div>

            <div className="mx-auto flex max-w-4xl flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/20">
                <Monitor className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-semibold tracking-tight">
                  Presentation in progress
                </h2>
                <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                  The main stage is kept simple so the room layout appears
                  immediately, then the secondary effects continue after mount.
                </p>
              </div>
              <div className="grid w-full max-w-3xl gap-4 md:grid-cols-2">
                <div className="aspect-video rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Slide 1
                  </p>
                  <div className="mt-4 h-3 w-2/3 rounded-full bg-slate-600" />
                  <div className="mt-3 h-3 w-1/2 rounded-full bg-slate-700" />
                  <div className="mt-8 grid gap-3">
                    <div className="h-12 rounded-xl bg-slate-800/80" />
                    <div className="h-12 rounded-xl bg-slate-800/50" />
                  </div>
                </div>
                <div className="aspect-video rounded-2xl border border-white/10 bg-white/5 p-5 text-left">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Slide 2
                  </p>
                  <div className="mt-4 grid h-[calc(100%-2rem)] grid-cols-[1.2fr_0.8fr] gap-3">
                    <div className="rounded-xl bg-slate-800/80" />
                    <div className="grid gap-3">
                      <div className="rounded-xl bg-slate-800/60" />
                      <div className="rounded-xl bg-slate-800/40" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {participants.map((participant) => (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              compact
              highlighted={participant.name === screenShareOwner}
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
          highlighted={participant.name === screenShareOwner}
        />
      ))}
    </div>
  );
}
