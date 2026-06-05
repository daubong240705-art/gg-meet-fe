"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Room as LiveKitRoom } from "livekit-client";

import type { Participant } from "@/components/meeting/room/types";

/** 1 = 100%. Capped at 100% so boosting can't clip/distort the audio. */
export const DEFAULT_PARTICIPANT_VOLUME = 1;
const MAX_PARTICIPANT_VOLUME = 1;

export type ParticipantVolumeState = {
  /** Last chosen level (0..1). Retained while muted so unmute can restore it. */
  volume: number;
  /** Local-only mute. Forces what *you* hear to 0 without touching their mic. */
  isMuted: boolean;
};

const DEFAULT_VOLUME_STATE: ParticipantVolumeState = {
  volume: DEFAULT_PARTICIPANT_VOLUME,
  isMuted: false,
};

type VolumeStateMap = Record<string, ParticipantVolumeState>;

type RoomLocalVolumeContextValue = {
  getParticipantVolume: (identity: string) => ParticipantVolumeState;
  setParticipantVolume: (identity: string, volume: number) => void;
  toggleParticipantMute: (identity: string) => void;
  resetParticipantVolume: (identity: string) => void;
};

const RoomLocalVolumeContext = createContext<RoomLocalVolumeContextValue | null>(null);

const clampVolume = (volume: number) =>
  Math.min(
    MAX_PARTICIPANT_VOLUME,
    Math.max(0, Number.isFinite(volume) ? volume : DEFAULT_PARTICIPANT_VOLUME),
  );

const getEffectiveVolume = (state: ParticipantVolumeState) =>
  state.isMuted ? 0 : state.volume;

type RoomLocalVolumeProviderProps = {
  roomRef: { current: LiveKitRoom | null };
  participants: Participant[];
  children: ReactNode;
};

/**
 * Per-listener volume control for other participants. Everything here is local:
 * it only changes the audio *this* browser plays back via
 * `RemoteParticipant.setVolume()` — it never touches the speaker's real mic, the
 * backend, or what anyone else hears.
 *
 * LiveKit persists the volume on the participant object and re-applies it when a
 * track re-subscribes, but a participant who leaves and rejoins arrives as a
 * fresh object at 100%, so we re-apply stored levels whenever the roster changes.
 */
export function RoomLocalVolumeProvider({
  roomRef,
  participants,
  children,
}: RoomLocalVolumeProviderProps) {
  const [volumeStates, setVolumeStates] = useState<VolumeStateMap>({});
  // Kept in sync synchronously by every handler so they can read the latest
  // state without being re-created on each change.
  const volumeStatesRef = useRef<VolumeStateMap>({});

  const applyVolume = useCallback(
    (identity: string, effectiveVolume: number) => {
      const room = roomRef.current;
      if (!room || !identity) {
        return;
      }

      room.remoteParticipants.get(identity)?.setVolume(effectiveVolume);
    },
    [roomRef],
  );

  const updateState = useCallback(
    (identity: string, next: ParticipantVolumeState) => {
      volumeStatesRef.current = { ...volumeStatesRef.current, [identity]: next };
      setVolumeStates((current) => ({ ...current, [identity]: next }));
      applyVolume(identity, getEffectiveVolume(next));
    },
    [applyVolume],
  );

  const getParticipantVolume = useCallback(
    (identity: string) => volumeStates[identity] ?? DEFAULT_VOLUME_STATE,
    [volumeStates],
  );

  const setParticipantVolume = useCallback(
    (identity: string, volume: number) => {
      const clamped = clampVolume(volume);
      const previous = volumeStatesRef.current[identity] ?? DEFAULT_VOLUME_STATE;

      updateState(identity, {
        volume: clamped,
        // Dragging the slider above 0 means the listener wants to hear them again.
        isMuted: clamped === 0 ? previous.isMuted : false,
      });
    },
    [updateState],
  );

  const toggleParticipantMute = useCallback(
    (identity: string) => {
      const previous = volumeStatesRef.current[identity] ?? DEFAULT_VOLUME_STATE;
      updateState(identity, { ...previous, isMuted: !previous.isMuted });
    },
    [updateState],
  );

  const resetParticipantVolume = useCallback(
    (identity: string) => {
      if (volumeStatesRef.current[identity]) {
        const rest = { ...volumeStatesRef.current };
        delete rest[identity];
        volumeStatesRef.current = rest;
      }

      setVolumeStates((current) => {
        if (!current[identity]) {
          return current;
        }

        const remaining = { ...current };
        delete remaining[identity];
        return remaining;
      });
      applyVolume(identity, DEFAULT_PARTICIPANT_VOLUME);
    },
    [applyVolume],
  );

  const remoteIdentities = useMemo(
    () => participants.filter((participant) => !participant.isLocal).map((participant) => participant.identity),
    [participants],
  );

  // Re-apply stored levels when the roster changes (e.g. a participant rejoined
  // as a fresh object back at 100%).
  useEffect(() => {
    for (const identity of remoteIdentities) {
      const state = volumeStatesRef.current[identity];

      if (state && getEffectiveVolume(state) !== DEFAULT_PARTICIPANT_VOLUME) {
        applyVolume(identity, getEffectiveVolume(state));
      }
    }
  }, [remoteIdentities, applyVolume]);

  const value = useMemo<RoomLocalVolumeContextValue>(
    () => ({
      getParticipantVolume,
      setParticipantVolume,
      toggleParticipantMute,
      resetParticipantVolume,
    }),
    [getParticipantVolume, setParticipantVolume, toggleParticipantMute, resetParticipantVolume],
  );

  return (
    <RoomLocalVolumeContext.Provider value={value}>
      {children}
    </RoomLocalVolumeContext.Provider>
  );
}

export function useRoomLocalVolumeControls() {
  const context = useContext(RoomLocalVolumeContext);

  if (!context) {
    throw new Error("useRoomLocalVolumeControls must be used within a RoomLocalVolumeProvider.");
  }

  return context;
}
