"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Home, Loader2, TimerReset, WifiOff, XCircle } from "lucide-react";

import Homeheader from "@/components/layout/home.header";
import {
  clearInstantMeetingSession,
  readInstantMeetingSession,
} from "@/lib/meeting/instant-meeting-session";
import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import Lobby, { type LobbyJoinPayload } from "@/components/meeting/lobby";
import MeetingRoom from "@/components/meeting/room/room";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getMeetingApiErrorDescription,
  isMeetingNotFoundError,
  meetingApi,
  normalizeMeetingParticipantStatus,
  type VerifyMeetingResponseData,
} from "@/service/meeting.service";

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

function MeetingLinkStateView({
  badge,
  title,
  description,
  meetingCode,
  icon,
  actions,
}: {
  badge: string;
  title: string;
  description: string;
  meetingCode?: string;
  icon: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_42%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.24))]" />

        <div className="relative mx-auto flex min-h-[calc(100vh-88px)] max-w-5xl items-center px-6 py-10">
          <Card className="w-full max-w-2xl border border-border/70 bg-background/90 p-8 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.55)] backdrop-blur">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-border/60 bg-card/80">
              {icon}
            </div>

            <div className="space-y-4">
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">
                {badge}
              </p>
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {title}
                </h1>
                <p className="max-w-xl text-base leading-7 text-muted-foreground">
                  {description}
                </p>
              </div>

              {meetingCode ? (
                <div className="inline-flex rounded-full border border-border/70 bg-card/70 px-4 py-2 text-sm text-muted-foreground">
                  Meeting code: <span className="ml-2 font-medium text-foreground">{meetingCode}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {actions}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MeetingPageContent({ meetingCode }: MeetingPageContentProps) {
  const router = useRouter();
  const normalizedMeetingCode = meetingCode.trim();
  const [joinState, setJoinState] = useState<MeetingJoinState | null>(() => {
    if (!meetingCode) {
      return null;
    }

    const pendingSession = readInstantMeetingSession(meetingCode);

    if (!pendingSession) {
      return null;
    }

    const participantStatus = normalizeMeetingParticipantStatus(
      pendingSession.participantStatus,
    );

    if (participantStatus === "WAITING") {
      return null;
    }

    return {
      title: pendingSession.title ?? null,
      userName: pendingSession.userName,
      guestId: pendingSession.guestId ?? null,
      isMicOn: pendingSession.isMicOn,
      isCameraOn: pendingSession.isCameraOn,
      livekitToken: pendingSession.livekitToken ?? null,
      meetingToken: pendingSession.meetingToken ?? null,
      participantStatus,
      hostId: pendingSession.hostId ?? null,
      hostName: pendingSession.hostName ?? null,
    };
  });
  const [leftMeetingState, setLeftMeetingState] = useState<LeftMeetingState | null>(null);
  const verifyMeetingQuery = useQuery<
    IBackendRes<VerifyMeetingResponseData | null>,
    IBackendRes<unknown>
  >({
    queryKey: ["meeting", "verify", normalizedMeetingCode],
    queryFn: async () => {
      const response = await meetingApi.verifyMeeting(normalizedMeetingCode);
      return assertApiSuccess(response);
    },
    enabled: Boolean(normalizedMeetingCode),
    retry: false,
  });

  const handleGoHome = () => {
    router.replace("/");
  };

  useEffect(() => {
    if (leftMeetingState || verifyMeetingQuery.isPending || verifyMeetingQuery.isSuccess) {
      return;
    }

    clearInstantMeetingSession(meetingCode);
  }, [leftMeetingState, meetingCode, verifyMeetingQuery.isPending, verifyMeetingQuery.isSuccess]);

  if (leftMeetingState) {
    return (
      <LeftMeetingView
        onRejoin={() => setLeftMeetingState(null)}
        onGoHome={handleGoHome}
      />
    );
  }

  if (!normalizedMeetingCode) {
    return (
      <MeetingLinkStateView
        badge="Meeting not found"
        title="This meeting link is not valid"
        description="The meeting code is missing or malformed. Check the link and ask the host for a fresh invite if needed."
        icon={<XCircle className="h-7 w-7 text-destructive" />}
        actions={(
          <Button type="button" size="lg" className="h-12 sm:w-auto" onClick={handleGoHome}>
            <Home className="h-4 w-4" />
            Go to homepage
          </Button>
        )}
      />
    );
  }

  if (verifyMeetingQuery.isPending) {
    return (
      <MeetingLinkStateView
        badge="Checking meeting"
        title="Verifying this meeting link"
        description="Please wait a moment while we confirm that this room is available before opening the lobby."
        meetingCode={normalizedMeetingCode}
        icon={<Loader2 className="h-7 w-7 animate-spin text-primary" />}
        actions={(
          <Button type="button" variant="outline" size="lg" className="h-12 sm:w-auto" onClick={handleGoHome}>
            <Home className="h-4 w-4" />
            Go to homepage
          </Button>
        )}
      />
    );
  }

  if (verifyMeetingQuery.isError) {
    const verificationError = verifyMeetingQuery.error as IBackendRes<unknown>;
    const isNotFound = isMeetingNotFoundError(verificationError);
    const description = isNotFound
      ? "This meeting room could not be found. Check the link or ask the host to share a valid room code."
      : getMeetingApiErrorDescription(verificationError) || "We could not verify this meeting right now. Please try again in a moment.";

    return (
      <MeetingLinkStateView
        badge={isNotFound ? "Meeting not found" : "Verification unavailable"}
        title={isNotFound ? "This meeting link is not valid" : "We couldn't verify this meeting"}
        description={description}
        meetingCode={normalizedMeetingCode}
        icon={isNotFound
          ? <XCircle className="h-7 w-7 text-destructive" />
          : <WifiOff className="h-7 w-7 text-primary" />}
        actions={isNotFound
          ? (
            <Button type="button" size="lg" className="h-12 sm:w-auto" onClick={handleGoHome}>
              <Home className="h-4 w-4" />
              Go to homepage
            </Button>
          )
          : (
            <>
              <Button
                type="button"
                size="lg"
                className="h-12 sm:w-auto"
                onClick={() => {
                  void verifyMeetingQuery.refetch();
                }}
              >
                Try again
              </Button>
              <Button type="button" variant="outline" size="lg" className="h-12 sm:w-auto" onClick={handleGoHome}>
                <Home className="h-4 w-4" />
                Go to homepage
              </Button>
            </>
          )}
      />
    );
  }

  if (!joinState) {
    return (
      <Lobby
        meetingCode={normalizedMeetingCode}
        onJoin={(payload) => {
          setLeftMeetingState(null);
          setJoinState(payload);
        }}
      />
    );
  }

  return (
    <MeetingRoom
      meetingCode={normalizedMeetingCode}
      title={joinState.title}
      userName={joinState.userName}
      isMicOn={joinState.isMicOn}
      isCameraOn={joinState.isCameraOn}
      livekitToken={joinState.livekitToken}
      meetingToken={joinState.meetingToken}
      hostId={joinState.hostId}
      hostName={joinState.hostName}
      onLeave={() => {
        clearInstantMeetingSession(normalizedMeetingCode);
        setJoinState(null);
        setLeftMeetingState({
          leftAt: Date.now(),
        });
      }}
    />
  );
}
