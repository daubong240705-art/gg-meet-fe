"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import type { AudioTrackReference, VideoTrackReference } from "./types";

type VideoTrackViewProps = {
  track: VideoTrackReference | null;
  className?: string;
  mirrored?: boolean;
  muted?: boolean;
};

export function VideoTrackView({
  track,
  className,
  mirrored = false,
  muted = false,
}: VideoTrackViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const element = videoRef.current;

    if (!element || !track) {
      return;
    }

    element.muted = muted;
    track.attach(element);

    return () => {
      track.detach(element);
      element.srcObject = null;
    };
  }, [track, muted]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={cn("h-full w-full object-cover", mirrored && "scale-x-[-1]", className)}
    />
  );
}

type AudioTrackViewProps = {
  track: AudioTrackReference | null;
};

export function AudioTrackView({ track }: AudioTrackViewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const element = audioRef.current;

    if (!element || !track) {
      return;
    }

    track.attach(element);

    return () => {
      track.detach(element);
      element.srcObject = null;
    };
  }, [track]);

  if (!track) {
    return null;
  }

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
}
