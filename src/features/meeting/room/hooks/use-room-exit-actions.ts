"use client";

import { useCallback, useRef, useState } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import { toast } from "sonner";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import type { MeetingSocketConnection } from "@/lib/meeting/meeting-websocket";
import { meetingApi } from "@/shared/services/meeting.service";

type UseRoomExitActionsParams = {
  meetingCode: string;
  meetingToken?: string | null;
  localMeetingParticipantId: number | null;
  roomRef: { current: LiveKitRoom | null };
  meetingSocketRef: { current: MeetingSocketConnection | null };
  disconnectMeetingSocket: (connection?: MeetingSocketConnection | null) => void;
  onBeforeExit?: () => void;
  resetHandRaise: () => void;
  onLeave: (reason?: "left" | "ended" | "kicked" | "banned") => void;
  onError: (message: string) => void;
};

export function useRoomExitActions({
  meetingCode,
  meetingToken,
  localMeetingParticipantId,
  roomRef,
  meetingSocketRef,
  disconnectMeetingSocket,
  onBeforeExit,
  resetHandRaise,
  onLeave,
  onError,
}: UseRoomExitActionsParams) {
  const hasExitedMeetingRef = useRef(false);
  const hasPreparedExitRef = useRef(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);

  const prepareExit = useCallback(() => {
    if (hasPreparedExitRef.current) {
      return;
    }

    hasPreparedExitRef.current = true;
    onBeforeExit?.();
  }, [onBeforeExit]);

  const exitMeeting = useCallback((reason: "left" | "ended" | "kicked" | "banned" = "left") => {
    if (hasExitedMeetingRef.current) {
      return;
    }

    hasExitedMeetingRef.current = true;
    prepareExit();
    resetHandRaise();
    disconnectMeetingSocket(meetingSocketRef.current);
    meetingSocketRef.current = null;
    roomRef.current?.disconnect();
    onLeave(reason);
  }, [disconnectMeetingSocket, meetingSocketRef, onLeave, prepareExit, resetHandRaise, roomRef]);

  const reportLeaveMeeting = useCallback(() => {
    if (localMeetingParticipantId === null) {
      return;
    }

    // Best effort: preserve backend participant status before the page transitions away.
    void meetingApi.leaveMeeting(meetingCode, localMeetingParticipantId, meetingToken, {
      keepalive: true,
    }).then((response) => {
      assertApiSuccess(response);
    }).catch(() => undefined);
  }, [localMeetingParticipantId, meetingCode, meetingToken]);

  const handleLeaveMeeting = useCallback(() => {
    prepareExit();
    reportLeaveMeeting();
    exitMeeting("left");
  }, [exitMeeting, prepareExit, reportLeaveMeeting]);

  const handleEndMeeting = useCallback((onEnded?: () => void) => {
    if (isEndingMeeting) {
      return;
    }

    setIsEndingMeeting(true);
    prepareExit();

    void meetingApi.endMeeting(meetingCode).then((response) => {
      assertApiSuccess(response);
      exitMeeting("ended");
      onEnded?.();
    }).catch((error) => {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String((error as IBackendRes<unknown>).message || "Unable to end the meeting.")
          : "Unable to end the meeting.";

      onError(errorMessage);
      toast.error("Unable to end meeting", {
        description: errorMessage,
      });
    }).finally(() => {
      setIsEndingMeeting(false);
    });
  }, [exitMeeting, isEndingMeeting, meetingCode, onError, prepareExit]);

  return {
    isEndingMeeting,
    exitMeeting,
    handleLeaveMeeting,
    handleEndMeeting,
  };
}
