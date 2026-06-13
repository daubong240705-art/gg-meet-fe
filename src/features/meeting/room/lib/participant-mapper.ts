import {
  ConnectionQuality,
  Participant as LiveKitParticipant,
  RemoteTrackPublication,
  Track,
} from "livekit-client";

import type {
  Participant,
  ParticipantConnectionQuality,
} from "@/components/meeting/room/types";
import {
  getDefaultParticipantHandState,
  getParticipantAccentClassName,
  getParticipantHandState,
  type ParticipantHandState,
} from "@/components/meeting/room/utils";
import { getLiveKitParticipantTracks } from "@/features/livekit/hooks";

import {
  getParticipantAvatarFromMetadata,
  getParticipantIdFromMetadata,
  getParticipantIdFromRecord,
  getParticipantRoleFromMetadata,
  normalizeParticipantDisplayName,
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

function getParticipantStatus(participant: LiveKitParticipant, isScreenSharing: boolean) {
  if (isScreenSharing) {
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

function resolveParticipantId(participant: LiveKitParticipant): number | null {
  const fromMetadata = getParticipantIdFromMetadata(participant.metadata);
  if (fromMetadata !== null) return fromMetadata;

  const fromAttributes = getParticipantIdFromRecord(participant.attributes);
  if (fromAttributes !== null) return fromAttributes;

  const fromIdentity = Number(participant.identity);
  if (Number.isFinite(fromIdentity)) return fromIdentity;

  return null;
}

function mapConnectionQuality(
  connectionQuality: ConnectionQuality,
): ParticipantConnectionQuality {
  switch (connectionQuality) {
    case ConnectionQuality.Excellent:
      return "excellent";
    case ConnectionQuality.Good:
      return "good";
    case ConnectionQuality.Poor:
      return "poor";
    case ConnectionQuality.Lost:
      return "lost";
    case ConnectionQuality.Unknown:
    default:
      return "unknown";
  }
}

function normalizeAudioLevel(audioLevel: number) {
  if (!Number.isFinite(audioLevel)) {
    return 0;
  }

  return Math.min(1, Math.max(0, audioLevel));
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
  localParticipantId?: number | null,
): Participant {
  const identity = participant.identity || participant.sid || localDisplayName || "participant";
  const cameraPublication = participant.getTrackPublication(Track.Source.Camera);
  const audioPublication = participant.getTrackPublication(Track.Source.Microphone);
  const screenSharePublication = participant.getTrackPublication(Track.Source.ScreenShare);
  const remoteScreenSharePublication = !participant.isLocal && screenSharePublication
    ? screenSharePublication as RemoteTrackPublication
    : null;
  const participantTracks = getLiveKitParticipantTracks(participant);
  const isScreenSharing = Boolean(screenSharePublication && !screenSharePublication.isMuted);
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
  const participantId = participant.isLocal
    ? (localParticipantId ?? resolveParticipantId(participant))
    : resolveParticipantId(participant);
  const participantDisplayName = participant.isLocal
    ? localDisplayName
    : normalizeParticipantDisplayName(
      participant.name,
      normalizeParticipantDisplayName(participant.metadata, participant.identity || "Guest"),
    );

  return {
    id: identity,
    identity,
    participantId,
    name:
      participant.isLocal
        ? localDisplayName
        : participantDisplayName,
    avatarSource: participant.isLocal
      ? localEmail?.trim() || identity
      : participant.identity?.trim() || participantDisplayName || identity,
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
    isScreenSharing,
    connectionQuality: mapConnectionQuality(participant.connectionQuality),
    audioLevel: normalizeAudioLevel(participant.audioLevel),
    accentClassName: getParticipantAccentClassName(identity),
    status: getParticipantStatus(participant, isScreenSharing),
    cameraTrack: participantTracks.cameraTrack,
    audioTrack: participant.isLocal ? null : participantTracks.audioTrack,
    screenShareTrack: participantTracks.screenShareTrack,
    screenSharePublication: remoteScreenSharePublication,
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
  localParticipantId?: number | null,
): Participant {
  return {
    id: "self",
    identity: "self",
    participantId: localParticipantId ?? null,
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
    connectionQuality: "unknown",
    audioLevel: 0,
    accentClassName: "from-primary/30 via-primary/10 to-background",
    status: isScreenSharing ? "Presenting" : "You",
    cameraTrack: null,
    audioTrack: null,
    screenShareTrack: null,
    screenSharePublication: null,
  };
}

function areParticipantEqual(participant: Participant, nextParticipant: Participant) {
  return participant.id === nextParticipant.id
    && participant.identity === nextParticipant.identity
    && participant.participantId === nextParticipant.participantId
    && participant.name === nextParticipant.name
    && participant.avatarSource === nextParticipant.avatarSource
    && participant.avatarUrl === nextParticipant.avatarUrl
    && participant.isHost === nextParticipant.isHost
    && participant.isLocal === nextParticipant.isLocal
    && participant.handRaised === nextParticipant.handRaised
    && participant.handRaisedAt === nextParticipant.handRaisedAt
    && participant.isMuted === nextParticipant.isMuted
    && participant.isCameraOff === nextParticipant.isCameraOff
    && participant.isSpeaking === nextParticipant.isSpeaking
    && participant.isScreenSharing === nextParticipant.isScreenSharing
    && participant.connectionQuality === nextParticipant.connectionQuality
    && participant.accentClassName === nextParticipant.accentClassName
    && participant.status === nextParticipant.status
    && participant.cameraTrack === nextParticipant.cameraTrack
    && participant.audioTrack === nextParticipant.audioTrack
    && participant.screenShareTrack === nextParticipant.screenShareTrack
    && participant.screenSharePublication === nextParticipant.screenSharePublication;
}

export function areParticipantsEqual(currentParticipants: Participant[], nextParticipants: Participant[]) {
  if (currentParticipants.length !== nextParticipants.length) {
    return false;
  }

  return currentParticipants.every((participant, index) => {
    const nextParticipant = nextParticipants[index];

    return areParticipantEqual(participant, nextParticipant);
  });
}

export function reconcileParticipants(
  currentParticipants: Participant[],
  nextParticipants: Participant[],
) {
  if (currentParticipants.length === 0) {
    return nextParticipants;
  }

  const currentParticipantById = new Map(
    currentParticipants.map((participant) => [participant.id, participant]),
  );
  let hasChanged = currentParticipants.length !== nextParticipants.length;

  const reconciledParticipants = nextParticipants.map((nextParticipant, index) => {
    const currentParticipant = currentParticipantById.get(nextParticipant.id);

    if (!currentParticipant || !areParticipantEqual(currentParticipant, nextParticipant)) {
      hasChanged = true;
      return nextParticipant;
    }

    if (currentParticipants[index] !== currentParticipant) {
      hasChanged = true;
    }

    return currentParticipant;
  });

  return hasChanged ? reconciledParticipants : currentParticipants;
}
