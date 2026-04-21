"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import Homeheader from "@/components/layout/home.header";
import { MEETING_IMAGES } from "@/lib/meeting/assets";
import {
  clearInstantMeetingSession,
  readInstantMeetingSession,
} from "@/lib/meeting/instant-meeting-session";
import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import Lobby, { type LobbyJoinPayload } from "@/components/meeting/lobby";
import MeetingRoom from "@/components/meeting/room/room";
import { Button } from "@/components/ui/button";
import {
  getMeetingApiErrorDescription,
  isMeetingNotFoundError,
  isMeetingScheduledNotStartedError,
  meetingApi,
  normalizeMeetingParticipantStatus,
  shouldHandleMeetingParticipantInLobby,
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
type MeetingExitState = {
  leftAt: number;
  reason: "left" | "ended";
};

function LeftMeetingView({
  reason,
  onRejoin,
  onGoHome,
}: {
  reason: "left" | "ended";
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
    <MeetingStatusView
      // OLD: left/end states used a card-based panel that felt heavier than the new
      // verification screens.
      // NEW: keep left/end states on the same minimal centered layout as the other meeting states.
      title={reason === "ended" ? "This meeting has ended" : "You left the meeting"}
      description={reason === "ended"
        ? `The host ended this meeting. Returning to the homepage in ${secondsRemaining}s.`
        : `Returning to the homepage in ${secondsRemaining}s.`}
      imageSrc={MEETING_IMAGES.bye}
      imageAlt={reason === "ended" ? "Meeting ended" : "Left meeting"}
      actions={(
        <>
          {reason === "left" ? (
            <Button type="button" size="lg" className="min-w-44" onClick={onRejoin}>
              Rejoin
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="lg" className="min-w-44" onClick={onGoHome}>
            Go to homepage
          </Button>
        </>
      )}
    />
  );
}

function MeetingStatusView({
  title,
  description,
  imageSrc = MEETING_IMAGES.loading,
  imageAlt = "",
  actions,
}: {
  title: string;
  description: string;
  imageSrc?: string;
  imageAlt?: string;
  actions: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-4xl flex-col items-center justify-center px-6 py-12 text-center">



        <div className="space-y-4 ">
          <h1 className="text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
            {title}
          </h1>
          <Image
            src={imageSrc}
            alt={imageAlt}
            width={520}
            height={390}
            priority
            className="mb-8 h-auto w-full max-w-sm object-contain sm:max-w-md"
          />
          <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            {description}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {actions}
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

    if (shouldHandleMeetingParticipantInLobby(participantStatus)) {
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
  const [leftMeetingState, setLeftMeetingState] = useState<MeetingExitState | null>(null);
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
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const handleGoHome = useCallback(() => {
    router.replace("/");
  }, [router]);

  const handleMeetingEnded = useCallback(() => {
    clearInstantMeetingSession(normalizedMeetingCode);
    setJoinState(null);
    setLeftMeetingState({
      leftAt: Date.now(),
      reason: "ended",
    });
  }, [normalizedMeetingCode]);

  const handleLobbyJoin = useCallback((payload: MeetingJoinState) => {
    setLeftMeetingState(null);
    setJoinState(payload);
  }, []);

  const handleLeaveMeeting = useCallback((reason: "left" | "ended" = "left") => {
    clearInstantMeetingSession(normalizedMeetingCode);
    setJoinState(null);
    setLeftMeetingState({
      leftAt: Date.now(),
      reason,
    });
  }, [normalizedMeetingCode]);

  useEffect(() => {
    if (leftMeetingState || verifyMeetingQuery.isPending || verifyMeetingQuery.isSuccess) {
      return;
    }

    clearInstantMeetingSession(meetingCode);
  }, [leftMeetingState, meetingCode, verifyMeetingQuery.isPending, verifyMeetingQuery.isSuccess]);

  if (leftMeetingState) {
    return (
      <LeftMeetingView
        reason={leftMeetingState.reason}
        onRejoin={() => setLeftMeetingState(null)}
        onGoHome={handleGoHome}
      />
    );
  }

  if (!normalizedMeetingCode) {
    return (
      <MeetingStatusView
        title="This meeting code is invalid"
        description="Check the link and ask the host to share a valid meeting code."
        actions={(
          <Button type="button" size="lg" className="min-w-44" onClick={handleGoHome}>
            Go to homepage
          </Button>
        )}
      />
    );
  }

  if (verifyMeetingQuery.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="absolute inset-0 bg-black/70" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center text-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="space-y-1">
            <p className="text-lg font-semibold tracking-tight">Checking meeting...</p>
            <p className="text-sm text-muted-foreground">
              Please wait while we verify this room.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (verifyMeetingQuery.isError) {
    const verificationError = verifyMeetingQuery.error as IBackendRes<unknown>;
    const isNotFound = isMeetingNotFoundError(verificationError);
    const isMeetingNotStarted = isMeetingScheduledNotStartedError(verificationError);
    const description = isNotFound
      ? "Check the link or ask the host to share a valid meeting code."
      : isMeetingNotStarted
        ? "Try again after the host starts the scheduled meeting."
        : getMeetingApiErrorDescription(verificationError) || "Please try again in a moment.";

    return (
      <MeetingStatusView
        // OLD: every non-404 verify error was shown as a generic verification problem.
        // NEW: scheduled meetings that have not started yet now render their own simple state.
        title={isNotFound
          ? "This meeting code is invalid"
          : isMeetingNotStarted
            ? "This meeting hasn't started yet"
            : "We couldn't verify this meeting"}
        description={description}
        actions={isNotFound
          ? (
            <Button type="button" size="lg" className="min-w-44" onClick={handleGoHome}>
              Go to homepage
            </Button>
          )
          : (
            <>
              <Button
                type="button"
                size="lg"
                className="min-w-44"
                onClick={() => {
                  void verifyMeetingQuery.refetch();
                }}
              >
                Try again
              </Button>
              <Button type="button" variant="ghost" size="lg" className="min-w-44" onClick={handleGoHome}>
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
        meetingTitle={verifyMeetingQuery.data?.data?.title?.trim() || null}
        hostId={verifyMeetingQuery.data?.data?.host?.id?.toString() ?? null}
        hostEmail={verifyMeetingQuery.data?.data?.host?.email?.trim() || null}
        onMeetingEnded={handleMeetingEnded}
        onJoin={handleLobbyJoin}
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
      onLeave={handleLeaveMeeting}
    />
  );
}
