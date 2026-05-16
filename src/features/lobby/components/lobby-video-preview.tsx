"use client";

import { type RefObject } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/user/user-avatar";

type LobbyVideoPreviewProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  isCameraOn: boolean;
  isMicOn: boolean;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
  onToggleCamera: () => void;
  onToggleMic: () => void;
};

export function LobbyVideoPreview({
  videoRef,
  isCameraOn,
  isMicOn,
  displayName,
  avatarUrl,
  email,
  onToggleCamera,
  onToggleMic,
}: LobbyVideoPreviewProps) {
  return (
    <Card className="relative aspect-video overflow-hidden rounded-4xl border border-border/70 bg-black p-0 shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
      {isCameraOn ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover scale-x-[-1]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-gray-800 to-gray-900">
          <div className="text-center">
            <UserAvatar
              avatarUrl={avatarUrl}
              name={displayName}
              email={email}
              className="mx-auto mb-4 h-24 w-24 text-4xl shadow-lg"
              initialsClassName="text-4xl"
            />
            <p className="text-sm text-white/70">Camera is off</p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 max-w-[70%] rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
        <div className="flex items-center gap-1.5">
          <p className="truncate font-medium">{displayName || "Guest"}</p>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-background/90 p-2 shadow-lg backdrop-blur-sm">
        <div className="flex items-center">
          <Button
            onClick={onToggleCamera}
            variant={isCameraOn ? "ghost" : "destructive"}
            size="icon-lg"
            className="rounded-full"
          >
            {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
        </div>

        <div className="h-8 w-px bg-border/70" />

        <div className="flex items-center">
          <Button
            onClick={onToggleMic}
            variant={isMicOn ? "ghost" : "destructive"}
            size="icon-lg"
            className="rounded-full"
          >
            {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </Card>
  );
}
