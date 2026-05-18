"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { Participant } from "@/components/meeting/room/types";
import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import { meetingApi, type MeetingTrackType } from "@/shared/services/meeting.service";

type MutingParticipantTrack = {
  participantId: number;
  trackType: MeetingTrackType;
};

type UseRoomTargetedMuteParams = {
  meetingCode: string;
  meetingToken?: string | null;
};

const getTrackLabel = (trackType: MeetingTrackType) =>
  trackType === "AUDIO" ? "microphone" : "camera";

export function useRoomTargetedMute({
  meetingCode,
  meetingToken,
}: UseRoomTargetedMuteParams) {
  const [mutingParticipantTrack, setMutingParticipantTrack] =
    useState<MutingParticipantTrack | null>(null);

  const handleMuteParticipantTrack = useCallback(async (
    participant: Participant,
    trackType: MeetingTrackType,
  ) => {
    const participantId = participant.participantId;
    const trackLabel = getTrackLabel(trackType);

    if (participantId === null) {
      toast.error(`Unable to mute ${trackLabel}`, {
        description: "This participant's ID could not be resolved.",
      });
      return;
    }

    if (
      (trackType === "AUDIO" && participant.isMuted)
      || (trackType === "VIDEO" && participant.isCameraOff)
    ) {
      return;
    }

    setMutingParticipantTrack({ participantId, trackType });

    try {
      const response = await meetingApi.muteParticipantTrack(
        meetingCode,
        participantId,
        trackType,
        meetingToken,
      );

      assertApiSuccess(response);

      toast.success(`${trackType === "AUDIO" ? "Microphone" : "Camera"} muted`, {
        description: `${participant.name}'s ${trackLabel} was turned off.`,
      });
    } catch (error) {
      const response = error as IBackendRes<unknown>;
      const errorMessage =
        typeof response?.message === "string" && response.message.trim()
          ? response.message
          : error instanceof Error
            ? error.message
            : `Unable to mute this participant's ${trackLabel}.`;

      toast.error(`Unable to mute ${trackLabel}`, {
        description: errorMessage,
      });
    } finally {
      setMutingParticipantTrack((current) =>
        current?.participantId === participantId && current.trackType === trackType
          ? null
          : current,
      );
    }
  }, [meetingCode, meetingToken]);

  return {
    mutingParticipantTrack,
    handleMuteParticipantTrack,
  };
}
