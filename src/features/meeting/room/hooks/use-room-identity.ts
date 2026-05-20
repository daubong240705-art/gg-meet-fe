"use client";

import { useMemo } from "react";

import type { MeetingRoomProps } from "@/components/meeting/room/types";
import { useAuthSession } from "@/lib/auth/auth-session";
import { getLiveKitWebsocketUrl } from "@/lib/config/api-url";
import { decodeMeetingToken } from "@/lib/meeting/meeting-websocket";
import {
  decodeJwtPayload,
  getParticipantRoleFromMetadata,
} from "@/features/meeting/room/lib";

export function useRoomIdentity({
  title,
  userName,
  livekitToken,
  meetingToken,
  hostId,
  hostName,
}: Pick<
  MeetingRoomProps,
  "title" | "userName" | "livekitToken" | "meetingToken" | "hostId" | "hostName"
>) {
  const { user } = useAuthSession();

  return useMemo(() => {
    const localEmail = user?.email?.trim() || null;
    const localAvatarUrl = user?.avatarUrl?.trim() || null;
    const displayName = userName.trim() || "Guest";
    const meetingTitle = title?.trim() || "Untitled meeting";
    const liveKitUrl = getLiveKitWebsocketUrl();
    const isLiveKitEnabled = Boolean(livekitToken && liveKitUrl);
    const decodedMeetingToken = decodeMeetingToken(meetingToken);
    const localMeetingRole = decodedMeetingToken.role;
    const localTokenPayload = decodeJwtPayload<{
      sub?: string;
      metadata?: string;
    }>(livekitToken);
    const localRole = getParticipantRoleFromMetadata(localTokenPayload?.metadata);
    const resolvedHostId =
      hostId?.trim()
      || (localRole === "HOST" ? localTokenPayload?.sub?.trim() || null : null);
    const resolvedHostName = hostName?.trim() || null;
    const localMeetingParticipantId = decodedMeetingToken.participantId;
    const canManageWaitingRoom = localMeetingRole === "HOST" || localRole === "HOST";
    const localUserCanUseHostMediaControls =
      canManageWaitingRoom
      || (resolvedHostId !== null && localTokenPayload?.sub?.trim() === resolvedHostId);
    const fallbackLocalParticipantIsHost =
      localRole === "HOST"
      || localMeetingRole === "HOST"
      || (resolvedHostId !== null && localTokenPayload?.sub?.trim() === resolvedHostId)
      || (resolvedHostName !== null && displayName.trim().toLowerCase() === resolvedHostName.toLowerCase());

    return {
      localEmail,
      localAvatarUrl,
      displayName,
      meetingTitle,
      liveKitUrl,
      isLiveKitEnabled,
      decodedMeetingToken,
      localMeetingRole,
      localTokenPayload,
      localRole,
      resolvedHostId,
      resolvedHostName,
      localMeetingParticipantId,
      canManageWaitingRoom,
      localUserCanUseHostMediaControls,
      fallbackLocalParticipantIsHost,
    };
  }, [
    hostId,
    hostName,
    livekitToken,
    meetingToken,
    title,
    user?.avatarUrl,
    user?.email,
    userName,
  ]);
}
