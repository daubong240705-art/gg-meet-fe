"use client";

import { useWaitingRoomStatus } from "@/features/meeting/hooks/use-waiting-room-status";
import { Card } from "@/components/ui/card";

import Homeheader from "../layout/home.header";
import type { LobbyJoinPayload } from "./lobby";
import { WaitingRoomStatusCard } from "./waiting-room-status-card";

type WaitingRoomProps = {
  meetingCode: string;
  joinState: LobbyJoinPayload;
  onApproved: (payload: LobbyJoinPayload) => void;
  onExit: () => void;
};

export default function WaitingRoom({
  meetingCode,
  joinState,
  onApproved,
  onExit,
}: WaitingRoomProps) {
  const {
    participantStatus,
    hostName,
    lastError,
    lastCheckedAt,
    isChecking,
    isWaiting,
    checkStatus,
  } = useWaitingRoomStatus({ meetingCode, joinState, onApproved });

  const isRejected = !isWaiting && participantStatus !== "ACCEPT";
  const displayName = joinState.userName.trim() || "Guest";

  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-5xl items-center px-6 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <WaitingRoomStatusCard
            meetingCode={meetingCode}
            displayName={displayName}
            participantStatus={participantStatus}
            hostName={hostName}
            lastError={lastError}
            lastCheckedAt={lastCheckedAt}
            isChecking={isChecking}
            isRejected={isRejected}
            onCheckAgain={() => void checkStatus(false)}
            onExit={onExit}
          />

          <Card className="border border-border/70 bg-muted/30 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              What happens next
            </p>

            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                Your join request has already been sent with the meeting code you
                entered.
              </p>
              <p>
                Once the host approves it, this page will move you into the
                meeting automatically.
              </p>
              <p>
                Keep this tab open if you want the room to connect as soon as
                approval arrives.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
