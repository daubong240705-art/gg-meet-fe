import {
  Participant as LiveKitParticipant,
  Track,
} from "livekit-client";

import type { Participant } from "@/components/meeting/room/types";
import {
  getDefaultParticipantHandState,
  getParticipantAccentClassName,
  getParticipantHandState,
  type ParticipantHandState,
} from "@/components/meeting/room/utils";
import { getLiveKitParticipantTracks } from "@/features/livekit/hooks";

import {
  getParticipantAvatarFromMetadata,
  getParticipantRoleFromMetadata,
} from "./metadata";

function isHostParticipant({
  participant,
  hostId,
  hostName,
  localRole,
}: {
  participant: LiveKitParticipant;
  hostId?: string | null;
  hostName?: string | null;
  localRole?: string | null;
}) {
  const participantRole = getParticipantRoleFromMetadata(participant.metadata);

  if (participantRole === "HOST") {
    return true;
  }

  if (participant.isLocal && localRole === "HOST") {
    return true;
  }

  const normalizedHostId = hostId?.trim();
  const normalizedIdentity = participant.identity?.trim();

  if (normalizedHostId && normalizedIdentity && normalizedHostId === normalizedIdentity) {
    return true;
  }

  const normalizedHostName = hostName?.trim().toLowerCase();
  const participantName = (participant.name?.trim() || "").toLowerCase();

  if (normalizedHostName && participantName && normalizedHostName === participantName) {
    return true;
  }

  return false;
}

function getParticipantStatus(participant: LiveKitParticipant) {
  if (participant.isScreenShareEnabled) {
    return "Presenting";
  }

  if (participant.isLocal) {
    return "You";
  }

  if (participant.isSpeaking) {
    return "Speaking";
  }

  if (participant.isCameraEnabled && participant.isMicrophoneEnabled) {
    return "In room";
  }

  if (participant.isCameraEnabled) {
    return "Camera on";
  }

  if (participant.isMicrophoneEnabled) {
    return "Listening";
  }

  return "Muted";
}

export function mapParticipantToUiParticipant(
  participant: LiveKitParticipant,
  localDisplayName: string,
  localEmail: string | null,
  localAvatarUrl: string | null,
  hostId: string | null | undefined,
  hostName: string | null | undefined,
  localRole: string | null,
  localHandState: ParticipantHandState,
  preferLocalHandState: boolean,
): Participant {
  const identity = participant.identity || participant.sid || localDisplayName || "participant";
  const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
  const audioPublication = participant.getTrackPublication(Track.Source.Microphone);
  const screenSharePublication = participant.getTrackPublication(Track.Source.ScreenShare);
  const participantTracks = getLiveKitParticipantTracks(participant);
  const participantAvatarUrl = participant.isLocal
    ? localAvatarUrl
    : getParticipantAvatarFromMetadata(participant.metadata);
  const handState =
    participant.isLocal && preferLocalHandState
      ? localHandState
      : getParticipantHandState(
        participant.attributes,
        participant.isLocal ? localHandState : getDefaultParticipantHandState(),
      );

  return {
    id: identity,
    identity,
    name:
      participant.isLocal
        ? localDisplayName
        : participant.name?.trim() || participant.identity || "Guest",
    avatarSource: participant.isLocal
      ? localEmail?.trim() || identity
      : participant.identity?.trim() || participant.name?.trim() || identity,
    avatarUrl: participantAvatarUrl,
    isHost: isHostParticipant({
      participant,
      hostId,
      hostName,
      localRole,
    }),
    isLocal: participant.isLocal,
    handRaised: handState.handRaised,
    handRaisedAt: handState.handRaisedAt,
    isMuted: !(audioPublication && !audioPublication.isMuted),
    isCameraOff: !(cameraPublication && !cameraPublication.isMuted),
    isSpeaking: participant.isSpeaking,
    isScreenSharing: Boolean(screenSharePublication),
    accentClassName: getParticipantAccentClassName(identity),
    status: getParticipantStatus(participant),
    cameraTrack: participantTracks.cameraTrack,
    audioTrack: participant.isLocal ? null : participantTracks.audioTrack,
    screenShareTrack: participantTracks.screenShareTrack,
  };
}

export function getFallbackLocalParticipant(
  displayName: string,
  localEmail: string | null,
  localAvatarUrl: string | null,
  isMicEnabled: boolean,
  isCameraEnabled: boolean,
  isScreenSharing: boolean,
  isHost: boolean,
  handState: ParticipantHandState,
): Participant {
  return {
    id: "self",
    identity: "self",
    name: displayName,
    avatarSource: localEmail?.trim() || displayName,
    avatarUrl: localAvatarUrl,
    isHost,
    isLocal: true,
    handRaised: handState.handRaised,
    handRaisedAt: handState.handRaisedAt,
    isMuted: !isMicEnabled,
    isCameraOff: !isCameraEnabled,
    isSpeaking: isMicEnabled,
    isScreenSharing,
    accentClassName: "from-primary/30 via-primary/10 to-background",
    status: isScreenSharing ? "Presenting" : "You",
    cameraTrack: null,
    audioTrack: null,
    screenShareTrack: null,
  };
}

export function areParticipantsEqual(currentParticipants: Participant[], nextParticipants: Participant[]) {
  if (currentParticipants.length !== nextParticipants.length) {
    return false;
  }

  return currentParticipants.every((participant, index) => {
    const nextParticipant = nextParticipants[index];

    return participant.id === nextParticipant.id
      && participant.identity === nextParticipant.identity
      && participant.name === nextParticipant.name
      && participant.avatarUrl === nextParticipant.avatarUrl
      && participant.isHost === nextParticipant.isHost
      && participant.isLocal === nextParticipant.isLocal
      && participant.handRaised === nextParticipant.handRaised
      && participant.handRaisedAt === nextParticipant.handRaisedAt
      && participant.isMuted === nextParticipant.isMuted
      && participant.isCameraOff === nextParticipant.isCameraOff
      && participant.isSpeaking === nextParticipant.isSpeaking
      && participant.isScreenSharing === nextParticipant.isScreenSharing
      && participant.accentClassName === nextParticipant.accentClassName
      && participant.status === nextParticipant.status
      && participant.cameraTrack === nextParticipant.cameraTrack
      && participant.audioTrack === nextParticipant.audioTrack
      && participant.screenShareTrack === nextParticipant.screenShareTrack;
  });
}
