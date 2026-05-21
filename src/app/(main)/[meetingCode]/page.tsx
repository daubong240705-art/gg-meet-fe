"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import Lobby from "@/components/meeting/lobby";
import MeetingRoom from "@/components/meeting/room/room";
import { Button } from "@/components/ui/button";
import { MEETING_IMAGES } from "@/lib/meeting/assets";
import {
  getMeetingApiErrorDescription,
  isMeetingNotFoundError,
  isMeetingScheduledNotStartedError,
} from "@/shared/services/meeting.service";
import { useVerifyMeeting } from "@/features/meeting/hooks/use-verify-meeting";
import {
  useMeetingPageState,
} from "@/features/meeting/hooks/use-meeting-page-state";
import {
  LeftMeetingView,
  MeetingStatusView,
} from "@/features/meeting/components/meeting-status-view";

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

function MeetingPageContent({ meetingCode }: MeetingPageContentProps) {
  const normalizedMeetingCode = meetingCode.trim();
  const verifyMeetingQuery = useVerifyMeeting(normalizedMeetingCode);
  const {
    joinState,
    leftMeetingState,
    handleGoHome,
    handleMeetingEnded,
    handleLobbyJoin,
    handleLeaveMeeting,
    handleRejoin,
  } = useMeetingPageState(normalizedMeetingCode, {
    isPending: verifyMeetingQuery.isPending,
    isSuccess: verifyMeetingQuery.isSuccess,
  });

  useEffect(() => {
    if (!joinState || typeof window === "undefined") {
      return;
    }

    const image = new window.Image();
    image.decoding = "async";
    image.src = MEETING_IMAGES.bye;
  }, [joinState]);

  if (leftMeetingState) {
    return (
      <LeftMeetingView
        reason={leftMeetingState.reason}
        onRejoin={handleRejoin}
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
        title={
          isNotFound
            ? "This meeting code is invalid"
            : isMeetingNotStarted
              ? "This meeting hasn't started yet"
              : "We couldn't verify this meeting"
        }
        description={description}
        actions={
          isNotFound ? (
            <Button type="button" size="lg" className="min-w-44" onClick={handleGoHome}>
              Go to homepage
            </Button>
          ) : (
            <>
              <Button
                type="button"
                size="lg"
                className="min-w-44"
                onClick={() => { void verifyMeetingQuery.refetch(); }}
              >
                Try again
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="min-w-44"
                onClick={handleGoHome}
              >
                Go to homepage
              </Button>
            </>
          )
        }
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
      selectedMic={joinState.selectedMic}
      selectedCamera={joinState.selectedCamera}
      livekitToken={joinState.livekitToken}
      meetingToken={joinState.meetingToken}
      hostId={joinState.hostId}
      hostName={joinState.hostName}
      onLeave={handleLeaveMeeting}
    />
  );
}
