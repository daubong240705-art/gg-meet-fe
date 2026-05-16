"use client";

import { useMemo } from "react";
import {
  Participant as LiveKitParticipant,
  Track,
  isAudioTrack,
  isVideoTrack,
} from "livekit-client";

export function getLiveKitParticipantTracks(participant: LiveKitParticipant) {
  const cameraTrack = participant.getTrackPublication(Track.Source.Camera)?.track;
  const audioTrack = participant.getTrackPublication(Track.Source.Microphone)?.track;
  const screenShareTrack = participant.getTrackPublication(Track.Source.ScreenShare)?.track;

  return {
    cameraTrack: cameraTrack && isVideoTrack(cameraTrack) ? cameraTrack : null,
    audioTrack: audioTrack && isAudioTrack(audioTrack) ? audioTrack : null,
    screenShareTrack: screenShareTrack && isVideoTrack(screenShareTrack) ? screenShareTrack : null,
  };
}

export function useLiveKitTracks(participant: LiveKitParticipant | null) {
  return useMemo(() => {
    if (!participant) {
      return {
        cameraTrack: null,
        audioTrack: null,
        screenShareTrack: null,
      };
    }

    return getLiveKitParticipantTracks(participant);
  }, [participant]);
}
