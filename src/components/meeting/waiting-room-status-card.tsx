import {
  Clock3,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  XCircle,
} from "lucide-react";

import type { MeetingParticipantStatus } from "@/shared/services/meeting.service";
import { formatParticipantStatus } from "@/features/meeting/hooks/use-waiting-room-status";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type WaitingRoomStatusCardProps = {
  meetingCode: string;
  displayName: string;
  participantStatus: MeetingParticipantStatus | null;
  hostName: string | null;
  lastError: string;
  lastCheckedAt: Date | null;
  isChecking: boolean;
  isRejected: boolean;
  onCheckAgain: () => void;
  onExit: () => void;
};

export function WaitingRoomStatusCard({
  meetingCode,
  displayName,
  participantStatus,
  hostName,
  lastError,
  lastCheckedAt,
  isChecking,
  isRejected,
  onCheckAgain,
  onExit,
}: WaitingRoomStatusCardProps) {
  const meetingLabel = meetingCode
    ? meetingCode.toUpperCase()
    : "your meeting";

  return (
    <Card className="border border-border/70 bg-background/90 p-8 shadow-sm">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {isRejected ? (
          <XCircle className="h-7 w-7" />
        ) : (
          <ShieldCheck className="h-7 w-7" />
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Waiting Room
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isRejected
            ? "Host did not admit this request"
            : "Waiting for the host to let you in"}
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground">
          {isRejected
            ? "You can go back and try joining again later."
            : "Stay on this page. We will keep checking your request and connect you to the LiveKit room as soon as the host approves it."}
        </p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-border/70 bg-muted/35 p-5">
          <p className="mb-2 text-sm text-muted-foreground">Meeting code</p>
          <p className="text-xl font-semibold tracking-wide">{meetingLabel}</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-muted/35 p-5">
          <p className="mb-2 text-sm text-muted-foreground">Joining as</p>
          <p className="text-xl font-semibold">{displayName}</p>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-border/70 bg-background p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-medium">
            <Clock3 className="h-4 w-4" />
            Status: {formatParticipantStatus(participantStatus)}
          </span>
          {hostName ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm font-medium">
              <UserRoundCheck className="h-4 w-4" />
              Host: {hostName}
            </span>
          ) : null}
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {lastCheckedAt
            ? `Last checked at ${lastCheckedAt.toLocaleTimeString("vi-VN")}.`
            : "Checking your request now..."}
        </p>

        {lastError ? (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            {lastError}
          </p>
        ) : null}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {!isRejected ? (
          <Button
            type="button"
            size="lg"
            className="h-12"
            onClick={onCheckAgain}
            disabled={isChecking}
          >
            {isChecking ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <RefreshCw className="h-5 w-5" />
            )}
            Check again
          </Button>
        ) : null}

        <Button
          type="button"
          size="lg"
          variant={isRejected ? "default" : "outline"}
          className="h-12"
          onClick={onExit}
        >
          {isRejected ? "Back to lobby" : "Cancel request"}
        </Button>
      </div>
    </Card>
  );
}
