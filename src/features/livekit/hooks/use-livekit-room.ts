"use client";

import { useEffect, useRef } from "react";
import {
  type ChatMessage as LiveKitChatMessage,
  Participant as LiveKitParticipant,
  ParticipantEvent,
  Room as LiveKitRoom,
  RoomEvent,
  type RoomOptions,
} from "livekit-client";

type UseLiveKitRoomParams = {
  enabled: boolean;
  token?: string | null;
  url: string;
  roomRef?: { current: LiveKitRoom | null };
  options?: RoomOptions;
  initialCameraEnabled: boolean;
  initialMicrophoneEnabled: boolean;
  onConnectionChange?: (isConnected: boolean) => void;
  onAudioPlaybackChange?: (canPlaybackAudio: boolean) => void;
  onParticipantsChange?: (room: LiveKitRoom) => void;
  onLocalAttributesChange?: (participant: LiveKitParticipant) => void;
  onChatMessage?: (
    message: LiveKitChatMessage,
    participant: LiveKitParticipant | undefined,
    room: LiveKitRoom,
  ) => void;
  onDeviceChange?: (room: LiveKitRoom) => void;
  onError?: (error: Error | null) => void;
  onReset?: () => void;
};

export function useLiveKitRoom({
  enabled,
  token,
  url,
  roomRef: providedRoomRef,
  options,
  initialCameraEnabled,
  initialMicrophoneEnabled,
  onConnectionChange,
  onAudioPlaybackChange,
  onParticipantsChange,
  onLocalAttributesChange,
  onChatMessage,
  onDeviceChange,
  onError,
  onReset,
}: UseLiveKitRoomParams) {
  const internalRoomRef = useRef<LiveKitRoom | null>(null);
  const roomRef = providedRoomRef ?? internalRoomRef;

  useEffect(() => {
    if (!enabled || !token) {
      roomRef.current = null;
      onReset?.();
      return;
    }

    let isDisposed = false;
    let syncParticipantsFrameId: number | null = null;
    const room = new LiveKitRoom(options);
    const participantSpeakingListeners = new Map<LiveKitParticipant, () => void>();
    roomRef.current = room;
    onReset?.();

    const syncParticipantsNow = () => {
      if (!isDisposed) {
        onParticipantsChange?.(room);
      }
    };

    const scheduleSyncParticipants = () => {
      if (isDisposed || syncParticipantsFrameId !== null) {
        return;
      }

      syncParticipantsFrameId = window.requestAnimationFrame(() => {
        syncParticipantsFrameId = null;
        syncParticipantsNow();
      });
    };

    const bindParticipantSpeakingListener = (participant: LiveKitParticipant) => {
      if (participantSpeakingListeners.has(participant)) {
        return;
      }

      const handleSpeakingChange = () => {
        scheduleSyncParticipants();
      };

      participant.on(ParticipantEvent.IsSpeakingChanged, handleSpeakingChange);
      participantSpeakingListeners.set(participant, () => {
        participant.off(ParticipantEvent.IsSpeakingChanged, handleSpeakingChange);
      });
    };

    const unbindParticipantSpeakingListener = (participant: LiveKitParticipant) => {
      participantSpeakingListeners.get(participant)?.();
      participantSpeakingListeners.delete(participant);
    };

    bindParticipantSpeakingListener(room.localParticipant);

    const handleMediaDeviceError = (error: Error) => {
      if (!isDisposed) {
        onError?.(error);
      }
    };

    room
      .on(RoomEvent.Connected, () => {
        onConnectionChange?.(true);
        scheduleSyncParticipants();
      })
      .on(RoomEvent.Reconnected, () => {
        onConnectionChange?.(true);
        scheduleSyncParticipants();
      })
      .on(RoomEvent.Disconnected, () => {
        if (!isDisposed) {
          onConnectionChange?.(false);
        }
      })
      .on(RoomEvent.ParticipantConnected, (participant) => {
        bindParticipantSpeakingListener(participant);
        scheduleSyncParticipants();
      })
      .on(RoomEvent.ParticipantDisconnected, (participant) => {
        unbindParticipantSpeakingListener(participant);
        scheduleSyncParticipants();
      })
      .on(RoomEvent.TrackSubscribed, scheduleSyncParticipants)
      .on(RoomEvent.TrackUnsubscribed, scheduleSyncParticipants)
      .on(RoomEvent.TrackMuted, scheduleSyncParticipants)
      .on(RoomEvent.TrackUnmuted, scheduleSyncParticipants)
      .on(RoomEvent.LocalTrackPublished, () => {
        scheduleSyncParticipants();
        onDeviceChange?.(room);
      })
      .on(RoomEvent.LocalTrackUnpublished, () => {
        scheduleSyncParticipants();
        onDeviceChange?.(room);
      })
      .on(RoomEvent.ActiveSpeakersChanged, scheduleSyncParticipants)
      .on(RoomEvent.ParticipantAttributesChanged, (_changedAttributes, participant) => {
        if (participant.isLocal) {
          onLocalAttributesChange?.(participant);
        }

        scheduleSyncParticipants();
      })
      .on(RoomEvent.ParticipantNameChanged, scheduleSyncParticipants)
      .on(RoomEvent.MediaDevicesChanged, () => {
        onDeviceChange?.(room);
      })
      .on(RoomEvent.ConnectionStateChanged, scheduleSyncParticipants)
      .on(RoomEvent.AudioPlaybackStatusChanged, (playing) => {
        if (!isDisposed) {
          onAudioPlaybackChange?.(playing);
        }
      })
      .on(RoomEvent.ChatMessage, (message, participant) => {
        onChatMessage?.(message, participant, room);
      })
      .on(RoomEvent.MediaDevicesError, handleMediaDeviceError);

    const connectRoom = async () => {
      try {
        onError?.(null);
        room.prepareConnection(url, token);
        await room.connect(url, token);

        if (isDisposed) {
          room.disconnect();
          return;
        }

        bindParticipantSpeakingListener(room.localParticipant);
        Array.from(room.remoteParticipants.values()).forEach(bindParticipantSpeakingListener);
        onAudioPlaybackChange?.(room.canPlaybackAudio);

        if (initialCameraEnabled && initialMicrophoneEnabled) {
          await room.localParticipant.enableCameraAndMicrophone();
        } else {
          if (initialCameraEnabled) {
            await room.localParticipant.setCameraEnabled(true);
          }

          if (initialMicrophoneEnabled) {
            await room.localParticipant.setMicrophoneEnabled(true);
          }
        }

        onDeviceChange?.(room);
        syncParticipantsNow();
      } catch (error) {
        if (!isDisposed) {
          onError?.(error instanceof Error ? error : new Error("Unable to connect to LiveKit."));
        }
      }
    };

    void connectRoom();

    return () => {
      isDisposed = true;
      onConnectionChange?.(false);
      participantSpeakingListeners.forEach((disposeListener) => {
        disposeListener();
      });
      participantSpeakingListeners.clear();

      if (syncParticipantsFrameId !== null) {
        window.cancelAnimationFrame(syncParticipantsFrameId);
      }

      room.removeAllListeners();
      room.disconnect();

      if (roomRef.current === room) {
        roomRef.current = null;
      }
    };
  }, [
    enabled,
    initialCameraEnabled,
    initialMicrophoneEnabled,
    onAudioPlaybackChange,
    onChatMessage,
    onConnectionChange,
    onDeviceChange,
    onError,
    onLocalAttributesChange,
    onParticipantsChange,
    onReset,
    options,
    roomRef,
    token,
    url,
  ]);

  return roomRef;
}
