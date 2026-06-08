"use client";

import { useEffect, useRef } from "react";
import {
  ConnectionState,
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
  initialCameraDeviceId?: string | null;
  initialMicrophoneDeviceId?: string | null;
  onConnectionChange?: (isConnected: boolean) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
  onAudioPlaybackChange?: (canPlaybackAudio: boolean) => void;
  onParticipantsChange?: (room: LiveKitRoom) => void;
  onLocalMediaStateChange?: (room: LiveKitRoom) => void;
  onLocalAttributesChange?: (participant: LiveKitParticipant) => void;
  onChatMessage?: (
    message: LiveKitChatMessage,
    participant: LiveKitParticipant | undefined,
    room: LiveKitRoom,
  ) => void;
  onDeviceChange?: (room: LiveKitRoom) => void;
  onRoomMetadataChanged?: (metadata: string) => void;
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
  initialCameraDeviceId,
  initialMicrophoneDeviceId,
  onConnectionChange,
  onConnectionStateChange,
  onAudioPlaybackChange,
  onParticipantsChange,
  onLocalMediaStateChange,
  onLocalAttributesChange,
  onChatMessage,
  onDeviceChange,
  onRoomMetadataChanged,
  onError,
  onReset,
}: UseLiveKitRoomParams) {
  const internalRoomRef = useRef<LiveKitRoom | null>(null);
  const roomRef = providedRoomRef ?? internalRoomRef;

  useEffect(() => {
    if (!enabled || !token) {
      roomRef.current = null;
      onConnectionChange?.(false);
      onConnectionStateChange?.(ConnectionState.Disconnected);
      onReset?.();
      return;
    }

    let isDisposed = false;
    let syncParticipantsFrameId: number | null = null;
    const room = new LiveKitRoom(options);
    const participantSpeakingListeners = new Map<LiveKitParticipant, () => void>();
    roomRef.current = room;
    onConnectionStateChange?.(ConnectionState.Disconnected);
    onReset?.();

    const syncParticipantsNow = () => {
      if (!isDisposed) {
        onParticipantsChange?.(room);
        onLocalMediaStateChange?.(room);
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
        onConnectionStateChange?.(ConnectionState.Connected);
        scheduleSyncParticipants();
      })
      .on(RoomEvent.Reconnected, () => {
        onConnectionChange?.(true);
        onConnectionStateChange?.(ConnectionState.Connected);
        scheduleSyncParticipants();
      })
      .on(RoomEvent.Disconnected, () => {
        if (!isDisposed) {
          onConnectionChange?.(false);
          onConnectionStateChange?.(ConnectionState.Disconnected);
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
      .on(RoomEvent.ConnectionStateChanged, (state) => {
        if (!isDisposed) {
          onConnectionStateChange?.(state);
        }

        scheduleSyncParticipants();
      })
      .on(RoomEvent.ConnectionQualityChanged, () => {
        scheduleSyncParticipants();
      })
      .on(RoomEvent.AudioPlaybackStatusChanged, (playing) => {
        if (!isDisposed) {
          onAudioPlaybackChange?.(playing);
        }
      })
      .on(RoomEvent.ChatMessage, (message, participant) => {
        onChatMessage?.(message, participant, room);
      })
      .on(RoomEvent.MediaDevicesError, handleMediaDeviceError)
      .on(RoomEvent.RoomMetadataChanged, (metadata) => {
        if (!isDisposed) {
          onRoomMetadataChanged?.(metadata);
        }
      });

    const connectRoom = async () => {
      try {
        onError?.(null);
        onConnectionStateChange?.(ConnectionState.Connecting);
        room.prepareConnection(url, token);
        await room.connect(url, token);

        if (isDisposed) {
          room.disconnect();
          return;
        }

        bindParticipantSpeakingListener(room.localParticipant);
        Array.from(room.remoteParticipants.values()).forEach(bindParticipantSpeakingListener);
        onAudioPlaybackChange?.(room.canPlaybackAudio);

        if (initialCameraDeviceId?.trim()) {
          await room.switchActiveDevice("videoinput", initialCameraDeviceId.trim()).catch(() => undefined);
        }

        if (initialMicrophoneDeviceId?.trim()) {
          await room.switchActiveDevice("audioinput", initialMicrophoneDeviceId.trim()).catch(() => undefined);
        }

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
      onConnectionStateChange?.(ConnectionState.Disconnected);
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
    initialCameraDeviceId,
    initialCameraEnabled,
    initialMicrophoneDeviceId,
    initialMicrophoneEnabled,
    onAudioPlaybackChange,
    onChatMessage,
    onConnectionChange,
    onConnectionStateChange,
    onDeviceChange,
    onRoomMetadataChanged,
    onError,
    onLocalMediaStateChange,
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
