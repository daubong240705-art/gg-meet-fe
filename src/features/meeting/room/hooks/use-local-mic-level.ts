"use client";

import { useEffect, useState } from "react";
import {
  createAudioAnalyser,
  RoomEvent,
  Track,
  type Room as LiveKitRoom,
} from "livekit-client";

type RoomRef = {
  current: LiveKitRoom | null;
};

function normalizeLevel(level: number) {
  if (!Number.isFinite(level)) {
    return 0;
  }

  return Math.min(1, Math.max(0, level));
}

export function useLocalMicLevel(
  roomRef: RoomRef,
  isMicEnabled: boolean,
  activeMicrophoneId?: string | null,
  isPageVisible = true,
) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!isMicEnabled || !isPageVisible || typeof window === "undefined") {
      return;
    }

    const room = roomRef.current;

    if (!room) {
      return;
    }

    let animationFrameId: number | null = null;
    let stopAnalyser: (() => void) | null = null;

    const stop = () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }

      stopAnalyser?.();
      stopAnalyser = null;
    };

    const start = () => {
      stop();

      const audioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone)
        ?.audioTrack;

      if (!audioTrack) {
        animationFrameId = window.requestAnimationFrame(() => {
          animationFrameId = null;
          setLevel(0);
        });
        return;
      }

      const { calculateVolume, cleanup } = createAudioAnalyser(audioTrack);
      let smoothedLevel = 0;
      let lastUpdateTime = 0;

      const tick = (timestamp: number) => {
        const nextLevel = normalizeLevel(calculateVolume());
        smoothedLevel = smoothedLevel * 0.72 + nextLevel * 0.28;

        if (timestamp - lastUpdateTime >= 33) {
          setLevel(smoothedLevel);
          lastUpdateTime = timestamp;
        }

        animationFrameId = window.requestAnimationFrame(tick);
      };

      animationFrameId = window.requestAnimationFrame(tick);
      stopAnalyser = () => {
        void cleanup().catch(() => undefined);
      };
    };

    start();

    room
      .on(RoomEvent.LocalTrackPublished, start)
      .on(RoomEvent.LocalTrackUnpublished, start)
      .on(RoomEvent.TrackMuted, start)
      .on(RoomEvent.TrackUnmuted, start);

    return () => {
      room
        .off(RoomEvent.LocalTrackPublished, start)
        .off(RoomEvent.LocalTrackUnpublished, start)
        .off(RoomEvent.TrackMuted, start)
        .off(RoomEvent.TrackUnmuted, start);
      stop();
    };
  }, [activeMicrophoneId, isMicEnabled, isPageVisible, roomRef]);

  return isMicEnabled && isPageVisible ? level : 0;
}
