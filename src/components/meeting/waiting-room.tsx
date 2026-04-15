"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, Loader2, RefreshCw, ShieldCheck, UserRoundCheck, XCircle } from "lucide-react";
import { toast } from "sonner";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import { persistInstantMeetingSession } from "@/lib/meeting/instant-meeting-session";
import {
  meetingApi,
  normalizeMeetingParticipantStatus,
  type MeetingParticipantStatus,
} from "@/service/meeting.service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import Homeheader from "../layout/home.header";
import type { LobbyJoinPayload } from "./lobby";

type WaitingRoomProps = {
  meetingCode: string;
  joinState: LobbyJoinPayload;
  onApproved: (payload: LobbyJoinPayload) => void;
  onExit: () => void;
};

const WAITING_ROOM_POLL_INTERVAL = 5000;

function getErrorDescription(error: IBackendRes<unknown>) {
  if (Array.isArray(error.errors)) {
    return error.errors[0];
  }

  if (typeof error.errors === "string") {
    return error.errors;
  }

  if (typeof error.error === "string") {
    return error.error;
  }

  return error.message;
}

function formatParticipantStatus(status: MeetingParticipantStatus | null) {
  if (!status) {
    return "WAITING";
  }

  return status.replaceAll("_", " ");
}

export default function WaitingRoom({
  meetingCode,
  joinState,
  onApproved,
  onExit,
}: WaitingRoomProps) {
  const [participantStatus, setParticipantStatus] = useState<MeetingParticipantStatus | null>(
    normalizeMeetingParticipantStatus(joinState.participantStatus) ?? "WAITING",
  );
  const [hostName, setHostName] = useState<string | null>(null);
  const [lastError, setLastError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const hasShownRejectionToastRef = useRef(false);
  const isMountedRef = useRef(true);
  const isCheckingRef = useRef(false);

  const isWaiting = participantStatus === null || participantStatus === "WAITING";
  const isRejected = !isWaiting && participantStatus !== "ACCEPT";
  const displayName = joinState.userName.trim() || "Guest";
  const meetingLabel = meetingCode ? meetingCode.toUpperCase() : "your meeting";

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const checkWaitingRoomStatus = useCallback(async (silent: boolean) => {
    if (isCheckingRef.current) {
      return;
    }

    isCheckingRef.current = true;
    setIsChecking(true);

    try {
      const response = await meetingApi.joinMeeting(
        meetingCode,
        joinState.guestId?.trim() && joinState.userName.trim()
          ? {
            guestId: joinState.guestId.trim(),
            guestName: joinState.userName.trim(),
          }
          : undefined,
      );
      const verifiedResponse = assertApiSuccess(response);

      if (!isMountedRef.current) {
        return;
      }

      const nextParticipantStatus =
        normalizeMeetingParticipantStatus(verifiedResponse.data?.participantStatus) ?? "WAITING";
      const nextLivekitToken = verifiedResponse.data?.livekitToken?.trim() || null;
      const nextMeetingToken =
        verifiedResponse.data?.meetingToken?.trim() || joinState.meetingToken || null;
      const resolvedMeetingCode = verifiedResponse.data?.meetingCode?.trim() || meetingCode;
      const nextJoinState: LobbyJoinPayload = {
        ...joinState,
        livekitToken: nextLivekitToken,
        meetingToken: nextMeetingToken,
        participantStatus: nextParticipantStatus,
      };

      setParticipantStatus(nextParticipantStatus);
      setHostName(verifiedResponse.data?.host?.fullName?.trim() || null);
      setLastError("");

      persistInstantMeetingSession({
        meetingCode: resolvedMeetingCode,
        userName: joinState.userName,
        guestId: joinState.guestId ?? null,
        isMicOn: joinState.isMicOn,
        isCameraOn: joinState.isCameraOn,
        livekitToken: nextLivekitToken,
        meetingToken: nextMeetingToken,
        participantStatus: nextParticipantStatus,
      });

      if (nextParticipantStatus === "ACCEPT") {
        if (!nextLivekitToken) {
          setLastError("The host approved your request, but the server did not return a LiveKit token yet.");
          return;
        }

        toast.success("Host approved your request", {
          description: "Connecting you to the meeting now.",
        });
        onApproved(nextJoinState);
        return;
      }

      if (nextParticipantStatus !== "WAITING" && !hasShownRejectionToastRef.current) {
        hasShownRejectionToastRef.current = true;
        toast.error("Unable to join meeting", {
          description:
            verifiedResponse.message ||
            `Your request is now ${formatParticipantStatus(nextParticipantStatus).toLowerCase()}.`,
        });
      }
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const errorDescription =
        error && typeof error === "object" && "message" in error
          ? getErrorDescription(error as IBackendRes<unknown>)
          : "Please try again in a moment.";

      setLastError(errorDescription || "Please try again in a moment.");

      if (!silent) {
        toast.error("Unable to check waiting room", {
          description: errorDescription || "Please try again in a moment.",
        });
      }
    } finally {
      if (!isMountedRef.current) {
        return;
      }

      isCheckingRef.current = false;
      setLastCheckedAt(new Date());
      setIsChecking(false);
    }
  }, [joinState, meetingCode, onApproved]);

  useEffect(() => {
    if (!isWaiting) {
      return;
    }

    void checkWaitingRoomStatus(true);

    const intervalId = window.setInterval(() => {
      void checkWaitingRoomStatus(true);
    }, WAITING_ROOM_POLL_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [checkWaitingRoomStatus, isWaiting]);

  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-5xl items-center px-6 py-10">
        <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="border border-border/70 bg-background/90 p-8 shadow-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {isRejected ? <XCircle className="h-7 w-7" /> : <ShieldCheck className="h-7 w-7" />}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Waiting Room
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                {isRejected ? "Host did not admit this request" : "Waiting for the host to let you in"}
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
                <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{lastError}</p>
              ) : null}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {!isRejected ? (
                <Button
                  type="button"
                  size="lg"
                  className="h-12"
                  onClick={() => void checkWaitingRoomStatus(false)}
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

          <Card className="border border-border/70 bg-muted/30 p-6">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              What happens next
            </p>

            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                Your join request has already been sent with the meeting code you entered.
              </p>
              <p>
                Once the host approves it, this page will move you into the meeting automatically.
              </p>
              <p>
                Keep this tab open if you want the room to connect as soon as approval arrives.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
