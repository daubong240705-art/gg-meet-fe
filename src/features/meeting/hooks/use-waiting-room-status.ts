"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import { persistInstantMeetingSession } from "@/lib/meeting/instant-meeting-session";
import { ensureMeetingAudioReady, playGuestAdmittedSound } from "@/lib/meeting/lobby-audio";
import {
  meetingApi,
  normalizeMeetingParticipantStatus,
  type MeetingParticipantStatus,
} from "@/shared/services/meeting.service";
import type { LobbyJoinPayload } from "@/features/lobby/types";

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

export function formatParticipantStatus(status: MeetingParticipantStatus | null) {
  if (!status) {
    return "WAITING";
  }

  return status.replaceAll("_", " ");
}

type UseWaitingRoomStatusParams = {
  meetingCode: string;
  joinState: LobbyJoinPayload;
  onApproved: (payload: LobbyJoinPayload) => void;
};

export function useWaitingRoomStatus({
  meetingCode,
  joinState,
  onApproved,
}: UseWaitingRoomStatusParams) {
  const [participantStatus, setParticipantStatus] =
    useState<MeetingParticipantStatus | null>(
      normalizeMeetingParticipantStatus(joinState.participantStatus) ?? "WAITING",
    );
  const [hostName, setHostName] = useState<string | null>(null);
  const [lastError, setLastError] = useState("");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const hasShownRejectionToastRef = useRef(false);
  const isMountedRef = useRef(true);
  const isCheckingRef = useRef(false);

  const isWaiting =
    participantStatus === null || participantStatus === "WAITING";

  useEffect(() => {
    ensureMeetingAudioReady();
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const checkStatus = useCallback(
    async (silent: boolean) => {
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
          normalizeMeetingParticipantStatus(
            verifiedResponse.data?.participantStatus,
          ) ?? "WAITING";
        const nextLivekitToken =
          verifiedResponse.data?.livekitToken?.trim() || null;
        const nextMeetingToken =
          verifiedResponse.data?.meetingToken?.trim() ||
          joinState.meetingToken ||
          null;
        const resolvedMeetingCode =
          verifiedResponse.data?.meetingCode?.trim() || meetingCode;
        const nextJoinState: LobbyJoinPayload = {
          ...joinState,
          title:
            verifiedResponse.data?.title?.trim() || joinState.title || null,
          livekitToken: nextLivekitToken,
          meetingToken: nextMeetingToken,
          participantStatus: nextParticipantStatus,
        };

        setParticipantStatus(nextParticipantStatus);
        setHostName(verifiedResponse.data?.host?.fullName?.trim() || null);
        setLastError("");

        persistInstantMeetingSession({
          meetingCode: resolvedMeetingCode,
          title:
            verifiedResponse.data?.title?.trim() || joinState.title || null,
          userName: joinState.userName,
          guestId: joinState.guestId ?? null,
          isMicOn: joinState.isMicOn,
          isCameraOn: joinState.isCameraOn,
          selectedMic: joinState.selectedMic ?? null,
          selectedCamera: joinState.selectedCamera ?? null,
          livekitToken: nextLivekitToken,
          meetingToken: nextMeetingToken,
          participantStatus: nextParticipantStatus,
        });

        if (nextParticipantStatus === "ACCEPT") {
          if (!nextLivekitToken) {
            setLastError(
              "The host approved your request, but the server did not return a LiveKit token yet.",
            );
            return;
          }

          playGuestAdmittedSound();
          toast.success("Host approved your request", {
            description: "Connecting you to the meeting now.",
          });
          onApproved(nextJoinState);
          return;
        }

        if (
          nextParticipantStatus !== "WAITING" &&
          !hasShownRejectionToastRef.current
        ) {
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
    },
    [joinState, meetingCode, onApproved],
  );

  useEffect(() => {
    if (!isWaiting) {
      return;
    }

    void checkStatus(true);

    const intervalId = window.setInterval(() => {
      void checkStatus(true);
    }, WAITING_ROOM_POLL_INTERVAL);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [checkStatus, isWaiting]);

  return {
    participantStatus,
    hostName,
    lastError,
    lastCheckedAt,
    isChecking,
    isWaiting,
    checkStatus,
  };
}
