"use client";

import { Monitor } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { useLayoutFlip } from "./layout-motion";
import ParticipantCard from "./participant-card";
import {
  getGridVisibleParticipantLimit,
  getScreenShareRailVisibleParticipantLimit,
  prioritizeParticipantsForLayout,
} from "./stage-layout";
import { AudioTrackView, VideoTrackView } from "./track-view";
import type { Participant } from "./types";

type RoomStageProps = {
  participants: Participant[];
  screenShareParticipants: Participant[];
  screenShareParticipant: Participant | null;
  isLocalScreenSharing: boolean;
  isPageVisible: boolean;
  isLayoutMotionEnabled?: boolean;
  isViewportResizing?: boolean;
  onSelectScreenShare: (participantId: string) => void;
  onToggleScreenShare: () => void;
};

function getGridContainerClassName(participantCount: number) {
  if (participantCount <= 1) {
    return "grid h-full grid-cols-1 auto-rows-fr";
  }

  if (participantCount === 2) {
    return "grid h-full grid-cols-1 auto-rows-fr gap-3 md:grid-cols-2 md:gap-4";
  }

  if (participantCount <= 4) {
    return "grid h-full grid-cols-2 auto-rows-fr content-center gap-3 md:gap-4";
  }

  if (participantCount <= 6) {
    return "grid h-full grid-cols-2 auto-rows-fr content-center gap-3 lg:grid-cols-3 md:gap-4";
  }

  if (participantCount <= 9) {
    return "grid h-full grid-cols-2 auto-rows-fr content-center gap-3 lg:grid-cols-3 md:gap-4";
  }

  return "grid h-full grid-cols-2 auto-rows-fr content-center gap-3 lg:grid-cols-3 2xl:grid-cols-4 md:gap-4";
}

function getGridCardClassName(participantCount: number) {
  if (participantCount <= 1) {
    return "h-auto min-h-0 max-h-full w-[min(100%,calc(100cqh*16/9))]";
  }

  if (participantCount === 2) {
    return "h-auto min-h-0 max-h-full w-[min(100%,calc(100cqh*16/9))]";
  }

  if (participantCount <= 4) {
    return "h-auto min-h-0 max-h-full w-[min(100%,calc(100cqh*16/9))]";
  }

  if (participantCount <= 6) {
    return "h-auto min-h-0 max-h-full w-[min(100%,calc(100cqh*16/9))]";
  }

  return "h-auto min-h-0 max-h-full w-[min(100%,calc(100cqh*16/9))]";
}

function getGridItemClassName(participantCount: number, index: number) {
  if (participantCount === 3 && index === 2) {
    return "col-span-2 mx-auto w-full max-w-[24rem] md:max-w-[calc(50%-0.5rem)]";
  }

  if (participantCount === 5 && index === 4) {
    return "col-span-2 mx-auto w-full max-w-[24rem] lg:col-span-1 lg:max-w-none";
  }

  return "";
}

function getScreenShareTabLabel(participant: Participant) {
  return participant.isLocal ? "You" : participant.name;
}

function RemoteAudioMixer({ participants }: { participants: Participant[] }) {
  return (
    <div aria-hidden="true" className="hidden">
      {participants.map((participant) => (
        !participant.isLocal && participant.audioTrack ? (
          <AudioTrackView
            key={`${participant.id}-audio`}
            track={participant.audioTrack}
          />
        ) : null
      ))}
    </div>
  );
}

function HiddenParticipantsPill({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-20 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm">
      +{count} more in participant list
    </div>
  );
}

export default function RoomStage({
  participants,
  screenShareParticipants,
  screenShareParticipant,
  isLocalScreenSharing,
  isPageVisible,
  isLayoutMotionEnabled = true,
  isViewportResizing = false,
  onSelectScreenShare,
  onToggleScreenShare,
}: RoomStageProps) {
  const screenShareParticipantId = screenShareParticipant?.id ?? null;
  const stageLayoutRef = useRef<HTMLDivElement | null>(null);
  useLayoutFlip(stageLayoutRef, { enabled: isLayoutMotionEnabled });

  if (participants.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center border border-border/70 bg-background/80">
        <p className="px-6 text-center text-sm text-muted-foreground">
          Waiting for participants to join room.
        </p>
      </Card>
    );
  }

  const renderParticipantRail = (railParticipants: Participant[], hiddenCount: number) => (
    <Card
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 max-w-full flex-col gap-0 overflow-hidden border border-border/70 bg-card/90 px-0 py-0 backdrop-blur-sm motion-reduce:animate-none",
        !isViewportResizing && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-3 motion-safe:duration-200",
      )}
    >

      <div className="grid min-h-0 w-full min-w-0 flex-1 auto-rows-max content-start gap-3 overflow-x-hidden overflow-y-auto p-3">
        {railParticipants.map((participant) => (
          <div
            key={participant.id}
            data-layout-id={`participant-${participant.id}`}
            className="min-h-0 min-w-0 max-w-full will-change-transform motion-safe:transition-opacity motion-safe:duration-200"
          >
            <ParticipantCard
              participant={participant}
              compact
              highlighted={participant.id === screenShareParticipantId}
              isLayoutTransitionEnabled={!isViewportResizing}
              renderAudio={false}
              renderVideo={isPageVisible}
            />
          </div>
        ))}

        {hiddenCount > 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/35 px-3 py-3 text-center text-xs font-medium text-muted-foreground">
            +{hiddenCount} more in participant list
          </div>
        ) : null}
      </div>
    </Card>
  );

  if (screenShareParticipant) {
    const railVisibleLimit = getScreenShareRailVisibleParticipantLimit(participants.length);
    const railParticipants = prioritizeParticipantsForLayout(
      participants,
      railVisibleLimit,
      screenShareParticipantId,
    );
    const hiddenRailParticipantCount = Math.max(0, participants.length - railParticipants.length);

    return (
      <div
        ref={stageLayoutRef}
        className={cn(
          "relative z-0 flex h-full min-h-0 w-full min-w-0 max-w-full flex-col gap-4 overflow-hidden motion-reduce:transition-none lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(13.75rem,17.5rem)] lg:items-stretch xl:grid-cols-[minmax(0,1fr)_18rem]",
          isViewportResizing
            ? "motion-safe:transition-none"
            : "motion-safe:transition-[gap,opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
        )}
      >
        <RemoteAudioMixer participants={participants} />

        <Card
          data-layout-id={`screen-share-${screenShareParticipant.id}`}
          className={cn(
            "order-1 relative min-h-72 min-w-0 flex-1 gap-0 overflow-hidden border border-border/70 bg-card/95 px-0 py-0 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.38)] will-change-transform motion-reduce:animate-none lg:min-h-0",
            isViewportResizing
              ? "motion-safe:transition-none"
              : "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:transition-[transform,opacity,box-shadow] motion-safe:duration-200 motion-safe:ease-out",
          )}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_38%),linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98))]" />

          <div className="relative flex h-full min-h-0 flex-col gap-4 p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
                <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-background/45 px-3 py-1.5 text-xs font-medium text-foreground motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-left-1 motion-safe:duration-200 motion-reduce:animate-none">
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
                        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 motion-reduce:transform-none",
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
                className="h-9 rounded-full border border-border/70 bg-background/45 px-3 text-foreground transition-transform motion-safe:duration-200 motion-safe:ease-out hover:-translate-y-0.5 hover:bg-muted hover:text-foreground motion-reduce:transform-none"
              >
                <Monitor className="h-4 w-4" />
                {isLocalScreenSharing ? "Stop sharing" : "Present now"}
              </Button>
            </div>

            <div className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-[2rem] motion-safe:transition-[border-radius,transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none">
              {isPageVisible && screenShareParticipant.screenShareTrack ? (
                <div className="h-full w-full motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-200 motion-reduce:animate-none">
                  <VideoTrackView
                    track={screenShareParticipant.screenShareTrack}
                    muted={screenShareParticipant.isLocal}
                    className="object-contain"
                  />
                </div>
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

        <div className="order-2 min-h-0 w-full min-w-0 max-w-full overflow-hidden lg:h-full">
          {renderParticipantRail(railParticipants, hiddenRailParticipantCount)}
        </div>
      </div>
    );
  }

  const visibleParticipantLimit = getGridVisibleParticipantLimit(participants.length);
  const visibleParticipants = prioritizeParticipantsForLayout(participants, visibleParticipantLimit);
  const hiddenParticipantCount = Math.max(0, participants.length - visibleParticipants.length);

  return (
    <div
      ref={stageLayoutRef}
      className={cn(
        "relative z-0 mx-auto h-full min-h-0 w-full min-w-0 max-w-420 overflow-hidden motion-reduce:transition-none",
        isViewportResizing
          ? "motion-safe:transition-none"
          : "motion-safe:transition-[gap,grid-template-columns,opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
        getGridContainerClassName(visibleParticipants.length),
      )}
    >
      <RemoteAudioMixer participants={participants} />

      {visibleParticipants.map((participant, index) => (
        <div
          key={participant.id}
          data-layout-id={`participant-${participant.id}`}
          className={cn(
            "flex min-h-0 min-w-0 max-w-full items-center justify-center overflow-hidden [container-type:size] will-change-transform motion-safe:transition-opacity motion-safe:duration-200",
            getGridItemClassName(visibleParticipants.length, index),
          )}
        >
          <ParticipantCard
            participant={participant}
            highlighted={participant.id === screenShareParticipantId}
            className={getGridCardClassName(visibleParticipants.length)}
            isLayoutTransitionEnabled={!isViewportResizing}
            renderAudio={false}
            renderVideo={isPageVisible}
          />
        </div>
      ))}

      <HiddenParticipantsPill count={hiddenParticipantCount} />
    </div>
  );
}
