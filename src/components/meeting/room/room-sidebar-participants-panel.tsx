"use client";

import { Clock3, Hand, Mic, MicOff, UserMinus, Video, VideoOff, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user/user-avatar";

import { RoomKickParticipantDialog } from "./room-kick-participant-dialog";
import type { Participant, WaitingParticipant } from "./types";
import { getInitials } from "./utils";

type RoomSidebarParticipantsPanelProps = {
  participants: Participant[];
  waitingParticipants: WaitingParticipant[];
  canManageWaitingRoom: boolean;
  onApproveWaitingParticipant: (participant: WaitingParticipant) => void;
  onRejectWaitingParticipant: (participant: WaitingParticipant) => void;
  onApproveAllWaitingParticipants: () => void;
  onKickParticipant?: (participant: Participant, isBan: boolean) => void;
};

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
}: RoomSidebarParticipantsPanelProps) {
  const [kickTarget, setKickTarget] = useState<Participant | null>(null);
  const [isBanChecked, setIsBanChecked] = useState(false);

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

        <div className="space-y-3">
          {participants.map((participant) => (
            <div
              key={participant.id}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/35 p-3 motion-safe:transition-[transform,opacity,background-color,border-color] motion-safe:duration-200 motion-safe:ease-out motion-reduce:transition-none hover:bg-background/50"
            >
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
                {canManageWaitingRoom && !participant.isLocal && !participant.isHost ? (
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="ml-1 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title={`Remove ${participant.name} from meeting`}
                    onClick={() => {
                      setKickTarget(participant);
                      setIsBanChecked(false);
                    }}
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>
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
