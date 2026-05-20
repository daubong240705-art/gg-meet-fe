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
  resetHandRaise,
  onLeave,
  onError,
}: UseRoomExitActionsParams) {
  const hasExitedMeetingRef = useRef(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);

  const exitMeeting = useCallback((reason: "left" | "ended" | "kicked" | "banned" = "left") => {
    if (hasExitedMeetingRef.current) {
      return;
    }

    hasExitedMeetingRef.current = true;
    resetHandRaise();
    disconnectMeetingSocket(meetingSocketRef.current);
    meetingSocketRef.current = null;
    roomRef.current?.disconnect();
    onLeave(reason);
  }, [disconnectMeetingSocket, meetingSocketRef, onLeave, resetHandRaise, roomRef]);

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
    reportLeaveMeeting();
    exitMeeting("left");
  }, [exitMeeting, reportLeaveMeeting]);

  const handleEndMeeting = useCallback(() => {
    if (isEndingMeeting) {
      return;
    }

    setIsEndingMeeting(true);

    void meetingApi.endMeeting(meetingCode).then((response) => {
      assertApiSuccess(response);
      exitMeeting("ended");
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
  }, [exitMeeting, isEndingMeeting, meetingCode, onError]);

  return {
    isEndingMeeting,
    exitMeeting,
    handleLeaveMeeting,
    handleEndMeeting,
  };
}
