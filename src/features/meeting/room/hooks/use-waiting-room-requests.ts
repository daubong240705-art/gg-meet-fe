"use client";

import { useCallback, useRef, useState } from "react";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import type { MeetingSocketMessage } from "@/lib/meeting/meeting-websocket";
import { playHostWaitingRequestSound } from "@/lib/meeting/lobby-audio";
import { meetingApi } from "@/shared/services/meeting.service";
import type { WaitingParticipant } from "@/components/meeting/room/types";
import {
  getWaitingParticipantName,
  mapWaitingRoomRequestToParticipant,
} from "@/features/meeting/room/lib";

const RECENTLY_HANDLED_WAITING_PARTICIPANT_TTL_MS = 5000;

type UseWaitingRoomRequestsParams = {
  canManageWaitingRoom: boolean;
  meetingCode: string;
  meetingToken?: string | null;
  onError: (message: string) => void;
};

export function useWaitingRoomRequests({
  canManageWaitingRoom,
  meetingCode,
  meetingToken,
  onError,
}: UseWaitingRoomRequestsParams) {
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);
  const waitingParticipantsRef = useRef<WaitingParticipant[]>([]);
  const recentlyHandledParticipantIdsRef = useRef<Map<number, number>>(new Map());

  const pruneRecentlyHandledParticipantIds = useCallback((now = Date.now()) => {
    recentlyHandledParticipantIdsRef.current.forEach((expiresAt, participantId) => {
      if (expiresAt <= now) {
        recentlyHandledParticipantIdsRef.current.delete(participantId);
      }
    });
  }, []);

  const markWaitingParticipantHandled = useCallback((participantId?: number | null) => {
    if (participantId === null || participantId === undefined) {
      return;
    }

    const now = Date.now();
    pruneRecentlyHandledParticipantIds(now);
    recentlyHandledParticipantIdsRef.current.set(
      participantId,
      now + RECENTLY_HANDLED_WAITING_PARTICIPANT_TTL_MS,
    );
  }, [pruneRecentlyHandledParticipantIds]);

  const isWaitingParticipantRecentlyHandled = useCallback((participantId: number) => {
    const now = Date.now();
    pruneRecentlyHandledParticipantIds(now);

    const expiresAt = recentlyHandledParticipantIdsRef.current.get(participantId);
    return expiresAt !== undefined && expiresAt > now;
  }, [pruneRecentlyHandledParticipantIds]);

  const setWaitingParticipantsAndRef = useCallback((
    nextValue: WaitingParticipant[] | ((currentParticipants: WaitingParticipant[]) => WaitingParticipant[]),
  ) => {
    setWaitingParticipants((currentParticipants) => {
      const nextParticipants =
        typeof nextValue === "function" ? nextValue(currentParticipants) : nextValue;
      waitingParticipantsRef.current = nextParticipants;
      return nextParticipants;
    });
  }, []);

  const clearWaitingParticipants = useCallback(() => {
    recentlyHandledParticipantIdsRef.current.clear();
    setWaitingParticipantsAndRef([]);
  }, [setWaitingParticipantsAndRef]);

  const upsertWaitingParticipant = useCallback((message: MeetingSocketMessage) => {
    const participantId = message.targetParticipantId;

    if (participantId === null || participantId === undefined) {
      return;
    }

    if (isWaitingParticipantRecentlyHandled(participantId)) {
      return;
    }

    const participantName = getWaitingParticipantName(message);
    const isNewWaitingParticipant = !waitingParticipantsRef.current.some(
      (participant) => participant.participantId === participantId,
    );

    setWaitingParticipantsAndRef((currentParticipants) => {
      const existingParticipantIndex = currentParticipants.findIndex(
        (participant) => participant.participantId === participantId,
      );

      if (existingParticipantIndex >= 0) {
        const nextParticipants = [...currentParticipants];
        nextParticipants[existingParticipantIndex] = {
          ...nextParticipants[existingParticipantIndex],
          name: participantName,
        };
        return nextParticipants;
      }

      return [
        ...currentParticipants,
        {
          participantId,
          name: participantName,
          requestedAt: Date.now(),
        },
      ];
    });

    if (!isNewWaitingParticipant) {
      return;
    }

    playHostWaitingRequestSound();
  }, [isWaitingParticipantRecentlyHandled, setWaitingParticipantsAndRef]);

  const removeWaitingParticipant = useCallback((participantId?: number | null) => {
    if (participantId === null || participantId === undefined) {
      return;
    }

    markWaitingParticipantHandled(participantId);
    setWaitingParticipantsAndRef((currentParticipants) =>
      currentParticipants.filter((participant) => participant.participantId !== participantId),
    );
  }, [markWaitingParticipantHandled, setWaitingParticipantsAndRef]);

  const syncWaitingParticipants = useCallback(async () => {
    if (!canManageWaitingRoom || !meetingToken) {
      clearWaitingParticipants();
      return;
    }

    const syncStartedAt = Date.now();

    try {
      const response = await meetingApi.getWaitingRoomRequests(meetingCode, meetingToken);
      const verifiedResponse = assertApiSuccess(response);
      const serverWaitingParticipants = (verifiedResponse.data ?? [])
        .map((request) => mapWaitingRoomRequestToParticipant(request))
        .filter((participant): participant is WaitingParticipant => {
          return participant !== null
            && !isWaitingParticipantRecentlyHandled(participant.participantId);
        });

      setWaitingParticipantsAndRef((currentParticipants) => {
        const mergedParticipants = new Map<number, WaitingParticipant>();

        serverWaitingParticipants.forEach((participant) => {
          mergedParticipants.set(participant.participantId, participant);
        });

        currentParticipants.forEach((participant) => {
          if (
            !mergedParticipants.has(participant.participantId)
            && participant.requestedAt >= syncStartedAt
          ) {
            mergedParticipants.set(participant.participantId, participant);
          }
        });

        return Array.from(mergedParticipants.values()).sort(
          (leftParticipant, rightParticipant) => leftParticipant.requestedAt - rightParticipant.requestedAt,
        );
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unable to refresh waiting-room requests.";

      onError(errorMessage);
    }
  }, [
    canManageWaitingRoom,
    clearWaitingParticipants,
    isWaitingParticipantRecentlyHandled,
    meetingCode,
    meetingToken,
    onError,
    setWaitingParticipantsAndRef,
  ]);

  const requestWaitingRoomResync = useCallback(() => {
    window.setTimeout(() => {
      void syncWaitingParticipants();
    }, 300);
  }, [syncWaitingParticipants]);

  return {
    waitingParticipants,
    clearWaitingParticipants,
    upsertWaitingParticipant,
    removeWaitingParticipant,
    syncWaitingParticipants,
    requestWaitingRoomResync,
  };
}
