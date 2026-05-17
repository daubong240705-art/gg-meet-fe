"use client";

import { useCallback, useMemo, useState } from "react";
import { Room as LiveKitRoom } from "livekit-client";

import type { Participant } from "@/components/meeting/room/types";
import {
  sortParticipantsByRaisedHand,
  type ParticipantHandState,
} from "@/components/meeting/room/utils";
import {
  areParticipantsEqual,
  getFallbackLocalParticipant,
  mapParticipantToUiParticipant,
} from "@/features/meeting/room/lib";

type UseRoomParticipantsParams = {
  displayName: string;
  localEmail: string | null;
  localAvatarUrl: string | null;
  resolvedHostId: string | null;
  resolvedHostName: string | null;
  localRole: string | null;
  localMeetingParticipantId: number | null;
  fallbackLocalParticipantIsHost: boolean;
  isLiveKitEnabled: boolean;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  localHandState: ParticipantHandState;
  localHandStateRef: { current: ParticipantHandState };
  preferLocalHandStateRef: { current: boolean };
};

export function useRoomParticipants({
  displayName,
  localEmail,
  localAvatarUrl,
  resolvedHostId,
  resolvedHostName,
  localRole,
  localMeetingParticipantId,
  fallbackLocalParticipantIsHost,
  isLiveKitEnabled,
  isMicEnabled,
  isCameraEnabled,
  localHandState,
  localHandStateRef,
  preferLocalHandStateRef,
}: UseRoomParticipantsParams) {
  const [liveParticipants, setLiveParticipants] = useState<Participant[]>([]);

  const handleLiveKitParticipantsChange = useCallback((room: LiveKitRoom) => {
    const nextParticipants = [
      mapParticipantToUiParticipant(
        room.localParticipant,
        displayName,
        localEmail,
        localAvatarUrl,
        resolvedHostId,
        resolvedHostName,
        localRole,
        localHandStateRef.current,
        preferLocalHandStateRef.current,
        localMeetingParticipantId,
      ),
      ...Array.from(room.remoteParticipants.values()).map((participant) =>
        mapParticipantToUiParticipant(
          participant,
          displayName,
          localEmail,
          localAvatarUrl,
          resolvedHostId,
          resolvedHostName,
          localRole,
          localHandStateRef.current,
          false,
        ),
      ),
    ];

    setLiveParticipants((currentParticipants) =>
      areParticipantsEqual(currentParticipants, nextParticipants)
        ? currentParticipants
        : nextParticipants,
    );
  }, [
    displayName,
    localAvatarUrl,
    localEmail,
    localHandStateRef,
    localMeetingParticipantId,
    localRole,
    preferLocalHandStateRef,
    resolvedHostId,
    resolvedHostName,
  ]);

  const participants = useMemo(() => {
    const fallbackParticipant = getFallbackLocalParticipant(
      displayName,
      localEmail,
      localAvatarUrl,
      isMicEnabled,
      isCameraEnabled,
      false,
      fallbackLocalParticipantIsHost,
      localHandState,
      localMeetingParticipantId,
    );
    const baseParticipants =
      isLiveKitEnabled && liveParticipants.length > 0
        ? liveParticipants
        : [fallbackParticipant];
    const hasScreenShare = baseParticipants.some((participant) => participant.isScreenSharing);

    return hasScreenShare
      ? baseParticipants
      : sortParticipantsByRaisedHand(baseParticipants);
  }, [
    displayName,
    fallbackLocalParticipantIsHost,
    isCameraEnabled,
    isLiveKitEnabled,
    isMicEnabled,
    liveParticipants,
    localAvatarUrl,
    localEmail,
    localHandState,
    localMeetingParticipantId,
  ]);

  return {
    participants,
    liveParticipants,
    handleLiveKitParticipantsChange,
  };
}
