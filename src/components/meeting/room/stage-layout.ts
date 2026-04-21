import type { Participant } from "./types";

const MAX_GRID_VISIBLE_VIDEO_TILES = 12;
const MAX_SCREEN_SHARE_RAIL_VIDEO_TILES = 6;

function getParticipantPriorityScore(
  participant: Participant,
  highlightedParticipantId?: string | null,
) {
  let score = 0;

  if (highlightedParticipantId && participant.id === highlightedParticipantId) {
    score += 10_000;
  }

  if (participant.isSpeaking && !participant.isMuted) {
    score += 6_000;
  }

  if (participant.isLocal) {
    score += 4_000;
  }

  if (participant.isScreenSharing) {
    score += 3_000;
  }

  if (participant.handRaised) {
    score += 2_000;
  }

  if (participant.isHost) {
    score += 1_000;
  }

  return score;
}

export function getGridVisibleParticipantLimit(participantCount: number) {
  if (participantCount <= 1) {
    return 1;
  }

  if (participantCount <= 2) {
    return 2;
  }

  if (participantCount <= 4) {
    return 4;
  }

  if (participantCount <= 6) {
    return 6;
  }

  if (participantCount <= 9) {
    return 9;
  }

  return MAX_GRID_VISIBLE_VIDEO_TILES;
}

export function getScreenShareRailVisibleParticipantLimit(participantCount: number) {
  return Math.min(participantCount, MAX_SCREEN_SHARE_RAIL_VIDEO_TILES);
}

export function prioritizeParticipantsForLayout(
  participants: Participant[],
  visibleLimit: number,
  highlightedParticipantId?: string | null,
) {
  if (visibleLimit <= 0) {
    return [];
  }

  if (participants.length <= visibleLimit) {
    return participants;
  }

  return participants
    .map((participant, index) => ({
      participant,
      index,
      score: getParticipantPriorityScore(participant, highlightedParticipantId),
    }))
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return left.index - right.index;
    })
    .slice(0, visibleLimit)
    .map(({ participant }) => participant);
}
