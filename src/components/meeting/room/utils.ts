import { getAvatarInitials } from "@/lib/user/avatar";

import type { Participant } from "./types";

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

export function getInitials(name: string) {
  return getAvatarInitials(name, "G");
}

export type ParticipantHandState = {
  handRaised: boolean;
  handRaisedAt: number | null;
};

export const PARTICIPANT_HAND_RAISED_ATTRIBUTE = "handRaised";
export const PARTICIPANT_HAND_RAISED_AT_ATTRIBUTE = "handRaisedAt";

export function getDefaultParticipantHandState(): ParticipantHandState {
  return {
    handRaised: false,
    handRaisedAt: null,
  };
}

export function getParticipantHandState(
  attributes?: Readonly<Record<string, string>>,
  fallbackState: ParticipantHandState = getDefaultParticipantHandState(),
): ParticipantHandState {
  const rawHandRaised = attributes?.[PARTICIPANT_HAND_RAISED_ATTRIBUTE];
  const rawHandRaisedAt = attributes?.[PARTICIPANT_HAND_RAISED_AT_ATTRIBUTE];
  const hasSyncedHandState = rawHandRaised !== undefined || rawHandRaisedAt !== undefined;

  if (!hasSyncedHandState) {
    return fallbackState;
  }

  const handRaised = rawHandRaised === "true" || rawHandRaised === "1";
  const parsedHandRaisedAt = rawHandRaisedAt ? Number(rawHandRaisedAt) : Number.NaN;
  const handRaisedAt =
    handRaised && Number.isFinite(parsedHandRaisedAt) && parsedHandRaisedAt > 0
      ? parsedHandRaisedAt
      : null;

  return {
    handRaised,
    handRaisedAt,
  };
}

export function getParticipantHandAttributes(nextState: ParticipantHandState) {
  return {
    [PARTICIPANT_HAND_RAISED_ATTRIBUTE]: String(nextState.handRaised),
    [PARTICIPANT_HAND_RAISED_AT_ATTRIBUTE]: nextState.handRaisedAt
      ? String(nextState.handRaisedAt)
      : "0",
  };
}

export function sortParticipantsByRaisedHand(participants: Participant[]) {
  return [...participants]
    .map((participant, index) => ({
      participant,
      index,
    }))
    .sort((left, right) => {
      if (left.participant.handRaised !== right.participant.handRaised) {
        return left.participant.handRaised ? -1 : 1;
      }

      if (left.participant.handRaised && right.participant.handRaised) {
        const leftRaisedAt = left.participant.handRaisedAt ?? 0;
        const rightRaisedAt = right.participant.handRaisedAt ?? 0;

        if (leftRaisedAt !== rightRaisedAt) {
          return rightRaisedAt - leftRaisedAt;
        }
      }

      return left.index - right.index;
    })
    .map(({ participant }) => participant);
}

const PARTICIPANT_ACCENT_CLASSES = [
  "from-sky-500/25 via-sky-500/10 to-background",
  "from-amber-500/25 via-orange-500/10 to-background",
  "from-emerald-500/25 via-emerald-500/10 to-background",
  "from-fuchsia-500/25 via-rose-500/10 to-background",
  "from-cyan-500/25 via-blue-500/10 to-background",
  "from-lime-500/25 via-emerald-500/10 to-background",
];

export function getParticipantAccentClassName(seed: string) {
  const normalizedSeed = seed.trim();

  if (!normalizedSeed) {
    return PARTICIPANT_ACCENT_CLASSES[0];
  }

  let hash = 0;

  for (let index = 0; index < normalizedSeed.length; index += 1) {
    hash = (hash << 5) - hash + normalizedSeed.charCodeAt(index);
    hash |= 0;
  }

  return PARTICIPANT_ACCENT_CLASSES[Math.abs(hash) % PARTICIPANT_ACCENT_CLASSES.length];
}
