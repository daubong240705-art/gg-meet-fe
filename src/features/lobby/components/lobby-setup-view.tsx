"use client";

import { type RefObject } from "react";
import { Loader2, Mic, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Homeheader from "@/components/layout/home.header";

import { LobbyDeviceSelector } from "./lobby-device-selector";
import { LobbyVideoPreview } from "./lobby-video-preview";

type LobbySetupViewProps = {
  meetingName: string;
  rawUserName: string;
  isSignedIn: boolean;
  isHostUser: boolean;
  isJoinPending: boolean;
  canJoinMeeting: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  isCameraOn: boolean;
  isMicOn: boolean;
  displayName: string;
  avatarUrl?: string | null;
  email?: string | null;
  audioDevices: MediaDeviceInfo[];
  videoDevices: MediaDeviceInfo[];
  selectedMic: string;
  selectedCamera: string;
  openMenu: string | null;
  deviceError?: string | null;
  onNameChange: (value: string) => void;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  onToggleMenu: (menu: "selector-mic" | "selector-camera") => void;
  onCloseMenu: () => void;
  onSelectMic: (deviceId: string) => void;
  onSelectCamera: (deviceId: string) => void;
  onJoin: () => void;
};

export function LobbySetupView({
  meetingName,
  rawUserName,
  isSignedIn,
  isHostUser,
  isJoinPending,
  canJoinMeeting,
  videoRef,
  isCameraOn,
  isMicOn,
  displayName,
  avatarUrl,
  email,
  audioDevices,
  videoDevices,
  selectedMic,
  selectedCamera,
  openMenu,
  deviceError,
  onNameChange,
  onToggleCamera,
  onToggleMic,
  onToggleMenu,
  onCloseMenu,
  onSelectMic,
  onSelectCamera,
  onJoin,
}: LobbySetupViewProps) {
  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)] xl:gap-12">
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  {meetingName}
                </h1>
              </div>
            </div>

            <LobbyVideoPreview
              videoRef={videoRef}
              isCameraOn={isCameraOn}
              isMicOn={isMicOn}
              displayName={displayName}
              avatarUrl={avatarUrl}
              email={email}
              onToggleCamera={onToggleCamera}
              onToggleMic={onToggleMic}
            />

            <div className="grid gap-3 sm:grid-cols-2">
              <LobbyDeviceSelector
                menuKey="selector-mic"
                label="Choose microphone"
                fallbackPrefix="Microphone"
                devices={audioDevices}
                selectedDeviceId={selectedMic}
                isOpen={openMenu === "selector-mic"}
                icon={<Mic className="h-4 w-4" />}
                onToggle={() => onToggleMenu("selector-mic")}
                onClose={onCloseMenu}
                onSelect={onSelectMic}
              />
              <LobbyDeviceSelector
                menuKey="selector-camera"
                label="Choose camera"
                fallbackPrefix="Camera"
                devices={videoDevices}
                selectedDeviceId={selectedCamera}
                isOpen={openMenu === "selector-camera"}
                icon={<Video className="h-4 w-4" />}
                onToggle={() => onToggleMenu("selector-camera")}
                onClose={onCloseMenu}
                onSelect={onSelectCamera}
              />
            </div>

            {deviceError ? <p className="text-sm text-destructive">{deviceError}</p> : null}
          </section>

          <aside className="xl:pt-20">
            <Card className="rounded-4xl border border-border/70 bg-card/80 p-6 shadow-sm backdrop-blur-sm sm:p-7">
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                    Ready to join
                  </h2>
                </div>

                <Input
                  id="lobby-user-name"
                  value={rawUserName}
                  onChange={(event) => onNameChange(event.target.value)}
                  placeholder="Enter your name to join"
                  className="h-12 rounded-xl text-base"
                  maxLength={80}
                  disabled={isSignedIn}
                />

                <Button
                  onClick={onJoin}
                  size="lg"
                  className="h-14 w-full rounded-full text-base sm:text-lg"
                  disabled={isJoinPending || !canJoinMeeting}
                >
                  {isJoinPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : null}
                  {isHostUser ? "Join" : "Request to join"}
                </Button>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
