"use client";

import { LayoutGroup, motion, type Transition } from "framer-motion";
import { Monitor } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MeetingTrackType } from "@/shared/services/meeting.service";

import ParticipantCard from "./participant-card";
import {
  getGridVisibleParticipantLimit,
  getScreenShareRailVisibleParticipantLimit,
  prioritizeParticipantsForLayout,
} from "./stage-layout";
import { AudioTrackView, VideoTrackView } from "./track-view";
import type { Participant } from "./types";

type MutingParticipantTrack = {
  participantId: number;
  trackType: MeetingTrackType;
};

type RoomStageProps = {
  participants: Participant[];
  screenShareParticipant: Participant | null;
  isPageVisible: boolean;
  isLayoutMotionEnabled?: boolean;
  isViewportResizing?: boolean;
  canManageParticipantMedia?: boolean;
  mutingParticipantTrack?: MutingParticipantTrack | null;
  onMuteParticipantTrack?: (participant: Participant, trackType: MeetingTrackType) => void;
};

const ROOM_STAGE_LAYOUT_TRANSITION: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 38,
  mass: 0.9,
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

function HiddenParticipantsPill({ count, className }: { count: number; className?: string }) {
  if (count <= 0) {
    return null;
  }

  return (
    <div className={cn("pointer-events-none absolute bottom-4 right-4 z-20 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur-sm", className)}>
      +{count} more in participant list
    </div>
  );
}

export default function RoomStage({
  participants,
  screenShareParticipant,
  isPageVisible,
  isLayoutMotionEnabled = true,
  isViewportResizing = false,
  canManageParticipantMedia = false,
  mutingParticipantTrack,
  onMuteParticipantTrack,
}: RoomStageProps) {
  const screenShareParticipantId = screenShareParticipant?.id ?? null;
  const isFramerLayoutEnabled = isLayoutMotionEnabled && !isViewportResizing;

  if (participants.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center border border-border/70 bg-background/80">
        <p className="px-6 text-center text-sm text-muted-foreground">
          Waiting for participants to join room.
        </p>
      </Card>
    );
  }

  const renderParticipantFilmstrip = (railParticipants: Participant[], hiddenCount: number) => (
    <Card
      className={cn(
        "relative flex h-full min-h-0 min-w-0 max-w-full gap-0 overflow-hidden border border-white/10 bg-slate-950/62 px-0 py-0 text-white shadow-[0_12px_36px_rgba(2,6,23,0.3)] backdrop-blur-lg motion-reduce:animate-none",
        !isViewportResizing && "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-200 lg:motion-safe:slide-in-from-right-3",
      )}
    >

      <div className="flex min-h-0 w-full min-w-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden p-2 [scrollbar-width:none] lg:flex-col lg:overflow-x-hidden lg:overflow-y-auto [&::-webkit-scrollbar]:hidden">
        {railParticipants.map((participant) => (
          <motion.div
            key={participant.id}
            layout={isFramerLayoutEnabled ? "position" : false}
            layoutId={`participant-${participant.id}`}
            transition={ROOM_STAGE_LAYOUT_TRANSITION}
            className="min-h-0 w-32 shrink-0 will-change-transform motion-safe:transition-opacity motion-safe:duration-200 lg:w-full"
          >
            <ParticipantCard
              participant={participant}
              compact
              highlighted={participant.id === screenShareParticipantId}
              isLayoutTransitionEnabled={!isViewportResizing}
              renderAudio={false}
              renderVideo={isPageVisible}
              canManageParticipantMedia={canManageParticipantMedia}
              mutingParticipantTrack={mutingParticipantTrack}
              onMuteParticipantTrack={onMuteParticipantTrack}
            />
          </motion.div>
        ))}

        {hiddenCount > 0 ? (
          <div className="flex aspect-video w-28 shrink-0 items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/10 px-2 py-2 text-center text-xs font-medium text-white/80 lg:w-full">
            +{hiddenCount} more
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
      <LayoutGroup id="room-stage-layout">
        <motion.div
          layout={isFramerLayoutEnabled}
          transition={ROOM_STAGE_LAYOUT_TRANSITION}
          className={cn(
            "relative z-0 flex h-full min-h-0 w-full min-w-0 max-w-full flex-col gap-2 overflow-hidden motion-reduce:transition-none lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] 2xl:grid-cols-[minmax(0,1fr)_16rem]",
            isViewportResizing
              ? "motion-safe:transition-none"
              : "motion-safe:transition-[gap,grid-template-columns,opacity,transform] motion-safe:duration-200 motion-safe:ease-out",
          )}
        >
          <RemoteAudioMixer participants={participants} />

          <motion.div
            layout={isFramerLayoutEnabled}
            transition={ROOM_STAGE_LAYOUT_TRANSITION}
            className="min-h-0 min-w-0 flex-1 lg:h-full"
          >
            <Card
              className={cn(
                "relative h-full min-h-0 min-w-0 gap-0 overflow-hidden border border-border/70 bg-card/95 px-0 py-0 text-card-foreground shadow-[0_24px_80px_rgba(2,6,23,0.38)] will-change-transform motion-reduce:animate-none",
                isViewportResizing
                  ? "motion-safe:transition-none"
                  : "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:transition-[transform,opacity,box-shadow] motion-safe:duration-200 motion-safe:ease-out",
              )}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_38%),linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.98))]" />

              <div className="relative z-20 flex h-full min-h-0 flex-col p-2 sm:p-3 lg:p-3">
                <div className="relative flex h-full min-h-0 w-full flex-1 overflow-hidden rounded-3xl motion-safe:transition-[border-radius,transform,opacity] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none">
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
          </motion.div>

          <div className="min-h-0 shrink-0 lg:h-full lg:min-w-0">
            {renderParticipantFilmstrip(railParticipants, hiddenRailParticipantCount)}
          </div>
        </motion.div>
      </LayoutGroup>
    );
  }

  const visibleParticipantLimit = getGridVisibleParticipantLimit(participants.length);
  const visibleParticipants = prioritizeParticipantsForLayout(participants, visibleParticipantLimit);
  const hiddenParticipantCount = Math.max(0, participants.length - visibleParticipants.length);

  return (
    <LayoutGroup id="room-stage-layout">
      <motion.div
        layout={isFramerLayoutEnabled}
        transition={ROOM_STAGE_LAYOUT_TRANSITION}
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
          <motion.div
            key={participant.id}
            layout={isFramerLayoutEnabled ? "position" : false}
            layoutId={`participant-${participant.id}`}
            transition={ROOM_STAGE_LAYOUT_TRANSITION}
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
              canManageParticipantMedia={canManageParticipantMedia}
              mutingParticipantTrack={mutingParticipantTrack}
              onMuteParticipantTrack={onMuteParticipantTrack}
            />
          </motion.div>
        ))}

        <HiddenParticipantsPill count={hiddenParticipantCount} />
      </motion.div>
    </LayoutGroup>
  );
}
