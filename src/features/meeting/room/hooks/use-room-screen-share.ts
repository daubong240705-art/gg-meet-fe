"use client";

import { useCallback, useMemo, useState } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import { toast } from "sonner";

import type { Participant } from "@/components/meeting/room/types";

type UseRoomScreenShareParams = {
  participants: Participant[];
  roomRef: { current: LiveKitRoom | null };
  isLiveKitEnabled: boolean;
  onError: (message: string) => void;
};

export function useRoomScreenShare({
  participants,
  roomRef,
  isLiveKitEnabled,
  onError,
}: UseRoomScreenShareParams) {
  const [activeScreenShareId, setActiveScreenShareId] = useState<string | null>(null);
  const screenShareParticipants = useMemo(
    () => participants.filter((participant) => participant.isScreenSharing),
    [participants],
  );
  const screenShareParticipant = useMemo(() => {
    if (screenShareParticipants.length === 0) {
      return null;
    }

    return screenShareParticipants.find((participant) => participant.id === activeScreenShareId)
      ?? screenShareParticipants.find((participant) => participant.isLocal)
      ?? screenShareParticipants[0]
      ?? null;
  }, [activeScreenShareId, screenShareParticipants]);
  const isScreenSharing = isLiveKitEnabled
    ? participants.some((participant) => participant.isLocal && participant.isScreenSharing)
    : false;

  const handleScreenShare = useCallback(() => {
    const room = roomRef.current;

    if (room && isLiveKitEnabled) {
      const nextValue = !isScreenSharing;

      void room.localParticipant.setScreenShareEnabled(nextValue).catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unable to update screen sharing.";

        onError(errorMessage);
      });
      return;
    }

    const errorMessage = "Screen sharing requires a LiveKit connection.";
    onError(errorMessage);
    toast.error("Unable to share screen", {
      description: errorMessage,
    });
  }, [isLiveKitEnabled, isScreenSharing, onError, roomRef]);

  const handlePresentOtherContent = useCallback(() => {
    const room = roomRef.current;

    if (room && isLiveKitEnabled) {
      void (async () => {
        if (isScreenSharing) {
          await room.localParticipant.setScreenShareEnabled(false);
        }

        await room.localParticipant.setScreenShareEnabled(true);
      })().catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : "Unable to present different content.";

        onError(errorMessage);
      });
      return;
    }

    const errorMessage = "Screen sharing requires a LiveKit connection.";
    onError(errorMessage);
    toast.error("Unable to share screen", {
      description: errorMessage,
    });
  }, [isLiveKitEnabled, isScreenSharing, onError, roomRef]);

  return {
    screenShareParticipants,
    screenShareParticipant,
    activeScreenShareId,
    setActiveScreenShareId,
    isScreenSharing,
    handleScreenShare,
    handlePresentOtherContent,
  };
}
