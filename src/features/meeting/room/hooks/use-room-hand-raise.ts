"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Participant as LiveKitParticipant,
  Room as LiveKitRoom,
} from "livekit-client";

import {
  getDefaultParticipantHandState,
  getParticipantHandAttributes,
  getParticipantHandState,
  type ParticipantHandState,
} from "@/components/meeting/room/utils";

const HAND_RAISE_COOLDOWN_MS = 1800;

type UseRoomHandRaiseParams = {
  roomRef: { current: LiveKitRoom | null };
  isLiveKitEnabled: boolean;
  onError: (message: string) => void;
};

export function useRoomHandRaise({
  roomRef,
  isLiveKitEnabled,
  onError,
}: UseRoomHandRaiseParams) {
  const localHandStateRef = useRef<ParticipantHandState>(getDefaultParticipantHandState());
  const preferLocalHandStateRef = useRef(false);
  const nextHandRaiseAllowedAtRef = useRef(0);
  const handRaiseCooldownTimeoutRef = useRef<number | null>(null);
  const [isHandRaiseCoolingDown, setIsHandRaiseCoolingDown] = useState(false);
  const [localHandState, setLocalHandState] = useState<ParticipantHandState>(
    getDefaultParticipantHandState(),
  );
  const [preferLocalHandState, setPreferLocalHandState] = useState(false);

  useEffect(() => {
    localHandStateRef.current = localHandState;
  }, [localHandState]);

  useEffect(() => {
    preferLocalHandStateRef.current = preferLocalHandState;
  }, [preferLocalHandState]);

  useEffect(() => () => {
    if (handRaiseCooldownTimeoutRef.current !== null) {
      window.clearTimeout(handRaiseCooldownTimeoutRef.current);
    }
  }, []);

  const handleLiveKitLocalAttributesChange = useCallback((participant: LiveKitParticipant) => {
    const nextLocalHandState = getParticipantHandState(participant.attributes);
    setLocalHandState(nextLocalHandState);
    setPreferLocalHandState(false);
  }, []);

  const handleToggleHandRaise = useCallback(() => {
    const now = Date.now();

    if (now < nextHandRaiseAllowedAtRef.current) {
      return;
    }

    const nextHandRaised = !localHandState.handRaised;
    const nextHandState: ParticipantHandState = {
      handRaised: nextHandRaised,
      handRaisedAt: nextHandRaised ? Date.now() : null,
    };

    nextHandRaiseAllowedAtRef.current = now + HAND_RAISE_COOLDOWN_MS;
    setIsHandRaiseCoolingDown(true);

    if (handRaiseCooldownTimeoutRef.current !== null) {
      window.clearTimeout(handRaiseCooldownTimeoutRef.current);
    }

    handRaiseCooldownTimeoutRef.current = window.setTimeout(() => {
      setIsHandRaiseCoolingDown(false);
      handRaiseCooldownTimeoutRef.current = null;
    }, HAND_RAISE_COOLDOWN_MS);

    setLocalHandState(nextHandState);
    setPreferLocalHandState(true);

    const room = roomRef.current;

    if (!room || !isLiveKitEnabled) {
      return;
    }

    void room.localParticipant.setAttributes(getParticipantHandAttributes(nextHandState)).catch((error) => {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to sync raised hand status.";

      onError(errorMessage);
    });
  }, [isLiveKitEnabled, localHandState.handRaised, onError, roomRef]);

  const resetHandRaise = useCallback(() => {
    setLocalHandState(getDefaultParticipantHandState());
    setPreferLocalHandState(false);
  }, []);

  return {
    localHandState,
    localHandStateRef,
    preferLocalHandState,
    preferLocalHandStateRef,
    isHandRaiseCoolingDown,
    handleLiveKitLocalAttributesChange,
    handleToggleHandRaise,
    resetHandRaise,
  };
}
