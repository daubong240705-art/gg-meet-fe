"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Room as LiveKitRoom, Track } from "livekit-client";
import { toast } from "sonner";

import type { Participant } from "@/components/meeting/room/types";
import {
  MEETING_SCREEN_SHARE_CAPTURE_OPTIONS,
  MEETING_SCREEN_SHARE_PUBLISH_OPTIONS,
} from "@/lib/meeting/screen-share-options";
import { meetingApi } from "@/shared/services/meeting.service";

type UseRoomScreenShareParams = {
  participants: Participant[];
  roomRef: { current: LiveKitRoom | null };
  isLiveKitEnabled: boolean;
  canShareScreen: boolean;
  isHost: boolean;
  meetingCode: string;
  meetingToken?: string | null;
  onError: (message: string) => void;
};

export function useRoomScreenShare({
  participants,
  roomRef,
  isLiveKitEnabled,
  canShareScreen,
  isHost,
  meetingCode,
  meetingToken,
  onError,
}: UseRoomScreenShareParams) {
  const [activeScreenShareId, setActiveScreenShareId] = useState<string | null>(null);
  const [isShareRequestDialogOpen, setIsShareRequestDialogOpen] = useState(false);
  const [isWaitingForShareApproval, setIsWaitingForShareApproval] = useState(false);
  const [isRequestingShareApproval, setIsRequestingShareApproval] = useState(false);
  const [hasShareApproval, setHasShareApproval] = useState(false);
  const hasShareApprovalRef = useRef(false);

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
  const canUseScreenShare = isHost || canShareScreen || hasShareApproval;

  useEffect(() => {
    const room = roomRef.current;

    if (!room || !isLiveKitEnabled || canUseScreenShare) {
      return;
    }

    // Check the actual publication (may be muted server-side but browser capture still running).
    const screenSharePub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    if (!screenSharePub) {
      return;
    }

    void room.localParticipant.setScreenShareEnabled(false).catch((error) => {
      onError(error instanceof Error ? error.message : "Unable to stop screen sharing.");
    });
  }, [canUseScreenShare, isLiveKitEnabled, onError, roomRef]);

  const startLiveKitScreenShare = useCallback((room: LiveKitRoom) => {
    void room.localParticipant.setScreenShareEnabled(
      true,
      MEETING_SCREEN_SHARE_CAPTURE_OPTIONS,
      MEETING_SCREEN_SHARE_PUBLISH_OPTIONS,
    ).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to start screen sharing.";
      onError(errorMessage);
    });
  }, [onError]);

  const handleScreenShare = useCallback(() => {
    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      const errorMessage = "Screen sharing requires a LiveKit connection.";
      onError(errorMessage);
      toast.error("Unable to share screen", { description: errorMessage });
      return;
    }

    if (isScreenSharing) {
      void room.localParticipant.setScreenShareEnabled(false)
        .then(() => {
          hasShareApprovalRef.current = false;
          setHasShareApproval(false);
        })
        .catch((error) => {
          onError(error instanceof Error ? error.message : "Unable to stop screen sharing.");
        });
      return;
    }

    if (canUseScreenShare) {
      startLiveKitScreenShare(room);
      return;
    }

    if (isWaitingForShareApproval) {
      return;
    }

    setIsShareRequestDialogOpen(true);
  }, [canUseScreenShare, isLiveKitEnabled, isScreenSharing, isWaitingForShareApproval, onError, roomRef, startLiveKitScreenShare]);

  const handlePresentOtherContent = useCallback(() => {
    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      const errorMessage = "Screen sharing requires a LiveKit connection.";
      onError(errorMessage);
      toast.error("Unable to share screen", { description: errorMessage });
      return;
    }

    if (!canUseScreenShare) {
      if (isWaitingForShareApproval) {
        return;
      }
      setIsShareRequestDialogOpen(true);
      return;
    }

    void (async () => {
      if (isScreenSharing) {
        await room.localParticipant.setScreenShareEnabled(false);
      }
      await room.localParticipant.setScreenShareEnabled(
        true,
        MEETING_SCREEN_SHARE_CAPTURE_OPTIONS,
        MEETING_SCREEN_SHARE_PUBLISH_OPTIONS,
      );
    })().catch((error) => {
      onError(error instanceof Error ? error.message : "Unable to present different content.");
    });
  }, [canUseScreenShare, isLiveKitEnabled, isScreenSharing, isWaitingForShareApproval, onError, roomRef]);

  const handleSendShareRequest = useCallback(async () => {
    setIsRequestingShareApproval(true);
    try {
      await meetingApi.requestScreenShare(meetingCode, meetingToken);
      setIsWaitingForShareApproval(true);
      setIsShareRequestDialogOpen(false);
    } catch {
      toast.error("Failed to send screen share request.", {
        description: "Please try again.",
      });
    } finally {
      setIsRequestingShareApproval(false);
    }
  }, [meetingCode, meetingToken]);

  const handleShareApproved = useCallback(() => {
    hasShareApprovalRef.current = true;
    setHasShareApproval(true);
    setIsWaitingForShareApproval(false);

    const room = roomRef.current;
    if (room && isLiveKitEnabled) {
      startLiveKitScreenShare(room);
    } else {
      toast("Screen share approved", {
        description: "You can now start sharing your screen.",
      });
    }
  }, [isLiveKitEnabled, roomRef, startLiveKitScreenShare]);

  const handleShareRejected = useCallback(() => {
    hasShareApprovalRef.current = false;
    setHasShareApproval(false);
    setIsWaitingForShareApproval(false);
    toast("Screen share request declined", {
      description: "The host did not approve your screen share request.",
    });
  }, []);

  const handleShareStopped = useCallback(() => {
    hasShareApprovalRef.current = false;
    setHasShareApproval(false);
    setIsWaitingForShareApproval(false);
    toast("Presentation stopped", {
      description: "The host stopped your screen share.",
    });
  }, []);

  const handleCloseShareRequestDialog = useCallback(() => {
    setIsShareRequestDialogOpen(false);
  }, []);

  return {
    screenShareParticipants,
    screenShareParticipant,
    activeScreenShareId,
    setActiveScreenShareId,
    isScreenSharing,
    isShareRequestDialogOpen,
    isWaitingForShareApproval,
    isRequestingShareApproval,
    handleScreenShare,
    handlePresentOtherContent,
    handleSendShareRequest,
    handleShareApproved,
    handleShareRejected,
    handleShareStopped,
    handleCloseShareRequestDialog,
  };
}
