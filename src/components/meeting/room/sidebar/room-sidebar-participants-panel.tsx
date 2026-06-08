"use client";

import { Clock3, Hand, Mic, MicOff, MoreVertical, UserMinus, Video, VideoOff, Volume2, VolumeX, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";
import {
  DEFAULT_PARTICIPANT_VOLUME,
  useRoomLocalVolumeControls,
} from "@/features/meeting/room/providers";
import type { MeetingTrackType } from "@/shared/services/meeting.service";

import { RoomKickParticipantDialog } from "../dialogs/room-kick-participant-dialog";
import type { Participant, WaitingParticipant } from "../types";
import { getInitials } from "../utils";

type MutingParticipantTrack = {
  participantId: number;
  trackType: MeetingTrackType;
};

type RoomSidebarParticipantsPanelProps = {
  participants: Participant[];
  waitingParticipants: WaitingParticipant[];
  canManageWaitingRoom: boolean;
  onApproveWaitingParticipant: (participant: WaitingParticipant) => void;
  onRejectWaitingParticipant: (participant: WaitingParticipant) => void;
  onApproveAllWaitingParticipants: () => void;
  onKickParticipant?: (participant: Participant, isBan: boolean) => void;
  mutingParticipantTrack?: MutingParticipantTrack | null;
  onMuteParticipantTrack?: (participant: Participant, trackType: MeetingTrackType) => void;
};

type ParticipantRowProps = {
  participant: Participant;
  canManageParticipantMedia: boolean;
  canKickParticipant: boolean;
  mutingParticipantTrack?: MutingParticipantTrack | null;
  onMuteParticipantTrack?: (participant: Participant, trackType: MeetingTrackType) => void;
  onKickParticipant: () => void;
  isActionMenuOpen: boolean;
  onActionMenuOpenChange: (isOpen: boolean) => void;
};

const ParticipantRow = memo(function ParticipantRow({
  participant,
  canManageParticipantMedia,
  canKickParticipant,
  mutingParticipantTrack,
  onMuteParticipantTrack,
  onKickParticipant,
  isActionMenuOpen,
  onActionMenuOpenChange,
}: ParticipantRowProps) {
  const {
    getParticipantVolume,
    setParticipantVolume,
    toggleParticipantMute,
    resetParticipantVolume,
  } = useRoomLocalVolumeControls();

  const isMutingAudio =
    mutingParticipantTrack?.participantId === participant.participantId
    && mutingParticipantTrack.trackType === "AUDIO";
  const isMutingVideo =
    mutingParticipantTrack?.participantId === participant.participantId
    && mutingParticipantTrack.trackType === "VIDEO";
  const canMuteAudio = canManageParticipantMedia && !participant.isMuted;
  const canMuteVideo = canManageParticipantMedia && !participant.isCameraOff;
  // You can adjust how loudly you hear anyone else — local only, never yourself.
  const canControlVolume = !participant.isLocal;
  const hasModerationActions = canMuteAudio || canMuteVideo || canKickParticipant;
  const hasActionMenu = canControlVolume || hasModerationActions;

  const volumeState = getParticipantVolume(participant.identity);
  const volumePercent = Math.round(volumeState.volume * 100);
  const isVolumeDefault = !volumeState.isMuted && volumeState.volume === DEFAULT_PARTICIPANT_VOLUME;

  const handleMuteTrack = (trackType: MeetingTrackType) => {
    onActionMenuOpenChange(false);
    onMuteParticipantTrack?.(participant, trackType);
  };

  return (
    <div className="relative flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-3 motion-safe:transition-[transform,opacity,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:bg-background/50">
      <UserAvatar
        avatarUrl={participant.avatarUrl}
        name={participant.name}
        email={participant.avatarSource}
        className="h-11 w-11"
        initialsClassName="text-sm"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{participant.name}</p>
          {participant.isHost ? (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 motion-reduce:animate-none">
              Host
            </span>
          ) : null}
          {participant.handRaised ? (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-amber-300/15 px-2 py-0.5 text-[11px] font-medium text-amber-300 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150 motion-reduce:animate-none">
              <Hand className="h-3 w-3" />
              Raised hand
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{participant.status}</p>
      </div>

      <div className="flex items-center gap-1 text-muted-foreground">
        {participant.handRaised ? (
          <Hand className="h-4 w-4 text-amber-300" />
        ) : null}

        {participant.isMuted ? (
          <MicOff className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4 text-emerald-400" />
        )}

        {participant.isCameraOff ? (
          <VideoOff className="h-4 w-4" />
        ) : (
          <Video className="h-4 w-4 text-sky-400" />
        )}

        {hasActionMenu ? (
          <div className="relative ml-1">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              title={`Open actions for ${participant.name}`}
              aria-label={`Open actions for ${participant.name}`}
              aria-expanded={isActionMenuOpen}
              onClick={() => onActionMenuOpenChange(!isActionMenuOpen)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {isActionMenuOpen ? (
              <div className="absolute right-0 top-9 z-30 w-60 overflow-hidden rounded-lg border border-border/80 bg-popover p-1 text-popover-foreground shadow-xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-100 motion-reduce:animate-none">
                {canControlVolume ? (
                  <div className="px-2.5 py-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        title={volumeState.isMuted ? `Unmute ${participant.name} for you` : `Mute ${participant.name} for you`}
                        aria-label={volumeState.isMuted ? `Unmute ${participant.name} for you` : `Mute ${participant.name} for you`}
                        aria-pressed={volumeState.isMuted}
                        onClick={() => toggleParticipantMute(participant.identity)}
                      >
                        {volumeState.isMuted ? (
                          <VolumeX className="h-4 w-4 text-destructive" />
                        ) : (
                          <Volume2 className="h-4 w-4" />
                        )}
                      </button>
                      <span className="text-sm font-medium text-foreground">Volume</span>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {volumeState.isMuted ? "Muted" : `${volumePercent}%`}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={volumePercent}
                      onChange={(event) =>
                        setParticipantVolume(participant.identity, Number(event.target.value) / 100)
                      }
                      className="mt-2 w-full cursor-pointer accent-primary"
                      aria-label={`Volume for ${participant.name}`}
                    />

                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className="text-[11px] leading-tight text-muted-foreground">
                        Only changes what you hear.
                      </p>
                      {!isVolumeDefault ? (
                        <button
                          type="button"
                          className="shrink-0 text-[11px] font-medium text-primary transition hover:underline"
                          onClick={() => resetParticipantVolume(participant.identity)}
                        >
                          Reset
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {canControlVolume && hasModerationActions ? (
                  <div className="my-1 h-px bg-border/70" />
                ) : null}

                {canMuteAudio ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
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
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                    disabled={isMutingVideo}
                    onClick={() => handleMuteTrack("VIDEO")}
                  >
                    <VideoOff className="h-4 w-4" />
                    Turn off camera
                  </button>
                ) : null}

                {canKickParticipant ? (
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      onActionMenuOpenChange(false);
                      onKickParticipant();
                    }}
                  >
                    <UserMinus className="h-4 w-4" />
                    Remove from meeting
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}, areParticipantRowPropsEqual);

function getMutingTrackTypeForParticipant(
  participant: Participant,
  mutingParticipantTrack?: MutingParticipantTrack | null,
) {
  if (participant.participantId === null) {
    return null;
  }

  return mutingParticipantTrack?.participantId === participant.participantId
    ? mutingParticipantTrack.trackType
    : null;
}

function areParticipantRowPropsEqual(
  previousProps: ParticipantRowProps,
  nextProps: ParticipantRowProps,
) {
  return previousProps.participant === nextProps.participant
    && previousProps.canManageParticipantMedia === nextProps.canManageParticipantMedia
    && previousProps.canKickParticipant === nextProps.canKickParticipant
    && previousProps.isActionMenuOpen === nextProps.isActionMenuOpen
    && getMutingTrackTypeForParticipant(
      nextProps.participant,
      previousProps.mutingParticipantTrack,
    ) === getMutingTrackTypeForParticipant(
      nextProps.participant,
      nextProps.mutingParticipantTrack,
    )
    && previousProps.onMuteParticipantTrack === nextProps.onMuteParticipantTrack;
}

function WaitingParticipantRow({
  participant,
  onApprove,
  onReject,
}: {
  participant: WaitingParticipant;
  onApprove: (participant: WaitingParticipant) => void;
  onReject: (participant: WaitingParticipant) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-background/55 p-3 backdrop-blur-sm motion-safe:transition-[transform,opacity,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:bg-background/70">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/20 font-semibold text-primary-foreground">
        {getInitials(participant.name)}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{participant.name}</p>
        <p className="text-sm text-muted-foreground">Waiting for host approval</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          className="rounded-full bg-primary px-3 text-primary-foreground hover:bg-primary/90"
          onClick={() => onApprove(participant)}
        >
          Admit
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          className="rounded-full border border-border/80 text-muted-foreground hover:bg-muted hover:text-foreground"
          onClick={() => onReject(participant)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function RoomSidebarParticipantsPanel({
  participants,
  waitingParticipants,
  canManageWaitingRoom,
  onApproveWaitingParticipant,
  onRejectWaitingParticipant,
  onApproveAllWaitingParticipants,
  onKickParticipant,
  mutingParticipantTrack,
  onMuteParticipantTrack,
}: RoomSidebarParticipantsPanelProps) {
  const [kickTarget, setKickTarget] = useState<Participant | null>(null);
  const [isBanChecked, setIsBanChecked] = useState(false);
  const [openActionMenuParticipantId, setOpenActionMenuParticipantId] = useState<string | null>(null);
  const participantListRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openActionMenuParticipantId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (participantListRef.current?.contains(event.target as Node)) {
        return;
      }

      setOpenActionMenuParticipantId(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenActionMenuParticipantId(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openActionMenuParticipantId]);

  return (
    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:duration-150 motion-reduce:animate-none">
      {canManageWaitingRoom ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">
                Waiting to Join
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {waitingParticipants.length > 0
                  ? `${waitingParticipants.length} request${waitingParticipants.length > 1 ? "s" : ""} waiting`
                  : "No pending requests right now"}
              </p>
            </div>

            {waitingParticipants.length > 1 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full border border-primary/25 bg-primary/10 px-3 text-primary hover:bg-primary/20 hover:text-primary"
                onClick={onApproveAllWaitingParticipants}
              >
                Admit all
              </Button>
            ) : null}
          </div>

          {waitingParticipants.length > 0 ? (
            <div className="space-y-3">
              {waitingParticipants.map((participant) => (
                <WaitingParticipantRow
                  key={participant.participantId}
                  participant={participant}
                  onApprove={onApproveWaitingParticipant}
                  onReject={onRejectWaitingParticipant}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/70 bg-background/35 px-4 py-4 text-sm text-muted-foreground">
              <Clock3 className="h-4 w-4 text-muted-foreground" />
              No one is waiting for approval.
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            In the Call
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {participants.length} participant{participants.length > 1 ? "s" : ""} connected
          </p>
        </div>

        <div ref={participantListRef} className="space-y-3">
          {participants.map((participant) => (
            <ParticipantRow
              key={participant.id}
              participant={participant}
              canManageParticipantMedia={canManageWaitingRoom && !participant.isLocal && !participant.isHost}
              mutingParticipantTrack={mutingParticipantTrack}
              onMuteParticipantTrack={onMuteParticipantTrack}
              onKickParticipant={() => {
                setKickTarget(participant);
                setIsBanChecked(false);
              }}
              canKickParticipant={canManageWaitingRoom && !participant.isLocal && !participant.isHost}
              isActionMenuOpen={openActionMenuParticipantId === participant.id}
              onActionMenuOpenChange={(isOpen) => {
                setOpenActionMenuParticipantId(isOpen ? participant.id : null);
              }}
            />
          ))}
        </div>
      </section>

      <RoomKickParticipantDialog
        participant={kickTarget}
        isBanChecked={isBanChecked}
        onBanCheckedChange={setIsBanChecked}
        onClose={() => setKickTarget(null)}
        onConfirm={() => {
          if (kickTarget) {
            onKickParticipant?.(kickTarget, isBanChecked);
            setKickTarget(null);
          }
        }}
      />
    </div>
  );
}
