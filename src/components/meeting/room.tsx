"use client";

import { Check, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type MeetingRoomProps = {
  meetingCode: string;
  userName: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  onLeave: () => void;
};

export default function MeetingRoom({
  meetingCode,
  userName,
  isMicOn,
  isCameraOn,
  onLeave,
}: MeetingRoomProps) {
  const roomLabel = meetingCode ? meetingCode.toUpperCase() : "MEETING";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="font-semibold">Kallio Meeting</div>
              <div className="text-sm text-muted-foreground">{roomLabel}</div>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 p-6 lg:grid-cols-[1fr,320px]">
        <Card className="flex min-h-[420px] items-center justify-center bg-gradient-to-br from-primary/10 via-card to-muted p-0">
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-3xl font-semibold text-primary-foreground">
              {userName.slice(0, 1).toUpperCase() || "G"}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{userName}</h1>
              <p className="text-muted-foreground">
                You joined room &quot;{roomLabel}&quot;
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm ring-1 ring-border">
                {isMicOn ? (
                  <Mic className="h-4 w-4 text-green-600" />
                ) : (
                  <MicOff className="h-4 w-4 text-destructive" />
                )}
                {isMicOn ? "Mic on" : "Mic off"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-background px-4 py-2 text-sm ring-1 ring-border">
                {isCameraOn ? (
                  <Video className="h-4 w-4 text-green-600" />
                ) : (
                  <VideoOff className="h-4 w-4 text-destructive" />
                )}
                {isCameraOn ? "Camera on" : "Camera off"}
              </span>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <Check className="mt-0.5 h-5 w-5 text-green-500" />
              <div>
                <h2 className="font-semibold">Meeting ready</h2>
                <p className="text-sm text-muted-foreground">
                  Lobby settings were carried over and the room now renders
                  cleanly.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Session info</h2>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Meeting code</span>
                <span className="font-medium text-foreground">{roomLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Participant</span>
                <span className="font-medium text-foreground">{userName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Audio</span>
                <span className="font-medium text-foreground">
                  {isMicOn ? "Enabled" : "Muted"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Video</span>
                <span className="font-medium text-foreground">
                  {isCameraOn ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </Card>

          <Button
            variant="destructive"
            size="lg"
            className="h-12"
            onClick={onLeave}
          >
            <PhoneOff className="h-4 w-4" />
            Leave room
          </Button>
        </div>
      </div>
    </div>
  );
}
