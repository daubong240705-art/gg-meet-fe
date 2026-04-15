"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Home, TimerReset } from "lucide-react";

import {
  clearInstantMeetingSession,
  readInstantMeetingSession,
} from "@/lib/meeting/instant-meeting-session";
import Lobby, { type LobbyJoinPayload } from "@/components/meeting/lobby";
import MeetingRoom from "@/components/meeting/room/room";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function MeetingPage() {
  const params = useParams<{ meetingCode: string }>();
  const meetingCode = Array.isArray(params?.meetingCode)
    ? params.meetingCode[0]
    : params?.meetingCode || "";

  return <MeetingPageContent key={meetingCode} meetingCode={meetingCode} />;
}

type MeetingPageContentProps = {
  meetingCode: string;
};

type MeetingJoinState = LobbyJoinPayload;
type LeftMeetingState = {
  leftAt: number;
};

function LeftMeetingView({
  onRejoin,
  onGoHome,
}: {
  onRejoin: () => void;
  onGoHome: () => void;
}) {
  const [secondsRemaining, setSecondsRemaining] = useState(60);

  useEffect(() => {
    const deadline = Date.now() + 60_000;

    const intervalId = window.setInterval(() => {
      const nextSeconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsRemaining(nextSeconds);

      if (nextSeconds <= 0) {
        window.clearInterval(intervalId);
        onGoHome();
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [onGoHome]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))] p-6">
      <Card className="w-full max-w-xl border border-border/70 bg-background/90 p-8 shadow-xl backdrop-blur">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 text-primary">
          <TimerReset className="h-7 w-7" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight">You have left the meeting</h1>
          <p className="text-sm text-muted-foreground">
            Automatically returning to the homepage in <span className="font-semibold text-foreground">{secondsRemaining}s</span>.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button type="button" size="lg" className="flex-1" onClick={onRejoin}>
            <ArrowLeft className="h-4 w-4" />
            Return to meeting
          </Button>
          <Button type="button" variant="outline" size="lg" className="flex-1" onClick={onGoHome}>
            <Home className="h-4 w-4" />
            Go to homepage
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MeetingPageContent({ meetingCode }: MeetingPageContentProps) {
  const router = useRouter();
  const [joinState, setJoinState] = useState<MeetingJoinState | null>(() => {
    if (!meetingCode) {
      return null;
    }

    const pendingSession = readInstantMeetingSession(meetingCode);

    if (!pendingSession) {
      return null;
    }

    return {
      userName: pendingSession.userName,
      isMicOn: pendingSession.isMicOn,
      isCameraOn: pendingSession.isCameraOn,
      livekitToken: pendingSession.livekitToken ?? null,
      meetingToken: pendingSession.meetingToken ?? null,
      participantStatus: pendingSession.participantStatus ?? null,
      hostId: pendingSession.hostId ?? null,
      hostName: pendingSession.hostName ?? null,
    };
  });
  const [leftMeetingState, setLeftMeetingState] = useState<LeftMeetingState | null>(null);

  const handleGoHome = () => {
    router.replace("/");
  };

  if (leftMeetingState) {
    return (
      <LeftMeetingView
        onRejoin={() => setLeftMeetingState(null)}
        onGoHome={handleGoHome}
      />
    );
  }

  if (!joinState) {
    return (
      <Lobby
        meetingCode={meetingCode}
        onJoin={(payload) => {
          setLeftMeetingState(null);
          setJoinState(payload);
        }}
      />
    );
  }

  return (
    <MeetingRoom
      meetingCode={meetingCode}
      userName={joinState.userName}
      isMicOn={joinState.isMicOn}
      isCameraOn={joinState.isCameraOn}
      livekitToken={joinState.livekitToken}
      hostId={joinState.hostId}
      hostName={joinState.hostName}
      onLeave={() => {
        clearInstantMeetingSession(meetingCode);
        setJoinState(null);
        setLeftMeetingState({
          leftAt: Date.now(),
        });
      }}
    />
  );
}
