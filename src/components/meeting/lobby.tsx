"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Mic, MicOff, User, Video, VideoOff } from "lucide-react";
import { toast } from "sonner";

import { useAuthSession } from "@/lib/auth/auth-session";
import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import { persistInstantMeetingSession } from "@/lib/meeting/instant-meeting-session";
import {
  meetingApi,
  normalizeMeetingParticipantStatus,
  type JoinMeetingResponseData,
} from "@/service/meeting.service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Homeheader from "../layout/home.header";

type LobbyJoinPayload = {
  userName: string;
  isMicOn: boolean;
  isCameraOn: boolean;
  livekitToken?: string | null;
  meetingToken?: string | null;
  participantStatus?: string | null;
};

type LobbyProps = {
  meetingCode: string;
  onJoin: (payload: LobbyJoinPayload) => void;
};

export type { LobbyJoinPayload };

export default function Lobby({ meetingCode, onJoin }: LobbyProps) {
  const router = useRouter();
  const { user } = useAuthSession();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionUserName = user?.fullName?.trim() || "";
  const [userNameOverride, setUserNameOverride] = useState("");
  const [hasEditedName, setHasEditedName] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [openMenu, setOpenMenu] = useState<"camera" | "mic" | null>(null);
  const [deviceError, setDeviceError] = useState("");

  const rawUserName = hasEditedName ? userNameOverride : sessionUserName;
  const userName = rawUserName.trim();
  const displayName = userName.trim() || "Guest";
  const canJoinMeeting = userName.length > 0;
  const meetingName = meetingCode ? meetingCode.toUpperCase() : "your meeting";
  const initials =
    displayName
      .split(/\s+/)
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "G";

  const joinMeetingMutation = useMutation<
    IBackendRes<JoinMeetingResponseData>,
    IBackendRes<unknown>,
    LobbyJoinPayload
  >({
    mutationFn: async (payload) => {
      const response = await meetingApi.joinMeeting(meetingCode, payload.userName);
      return assertApiSuccess(response);
    },
    onSuccess: (response, payload) => {
      const participantStatus = normalizeMeetingParticipantStatus(
        response.data?.participantStatus,
      );
      const livekitToken = response.data?.livekitToken?.trim() || null;
      const meetingToken = response.data?.meetingToken?.trim() || null;
      const resolvedMeetingCode = response.data?.meetingCode?.trim() || meetingCode;
      const nextJoinPayload: LobbyJoinPayload = {
        ...payload,
        livekitToken,
        meetingToken,
        participantStatus,
      };

      if (!livekitToken) {
        toast.error("Unable to join meeting", {
          description: "The server did not return a valid LiveKit token.",
        });
        return;
      }

      persistInstantMeetingSession({
        meetingCode: resolvedMeetingCode,
        userName: payload.userName,
        isMicOn: payload.isMicOn,
        isCameraOn: payload.isCameraOn,
        livekitToken,
        meetingToken,
        participantStatus,
      });

      onJoin(nextJoinPayload);
    },
    onError: (error) => {
      const errorDescription = Array.isArray(error.errors)
        ? error.errors[0]
        : typeof error.errors === "string"
          ? error.errors
          : typeof error.error === "string"
            ? error.error
            : error.message;

      toast.error("Unable to join meeting", {
        description: errorDescription || "Please try again in a moment.",
      });
    },
  });

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function loadDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter((device) => device.kind === "videoinput");
    const microphones = devices.filter((device) => device.kind === "audioinput");

    setVideoDevices(cameras);
    setAudioDevices(microphones);
    setSelectedCamera((current) => current || cameras[0]?.deviceId || "");
    setSelectedMic((current) => current || microphones[0]?.deviceId || "");
  }

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setDeviceError("This browser does not support camera or microphone preview.");
        return;
      }

      if (!isCameraOn && !isMicOn) {
        stopStream();
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isCameraOn ? { deviceId: selectedCamera || undefined } : false,
          audio: isMicOn ? { deviceId: selectedMic || undefined } : false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        stopStream();
        streamRef.current = stream;
        setDeviceError("");

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }

        await loadDevices();
      } catch {
        stopStream();
        setDeviceError("Allow camera and microphone access to use the lobby preview.");
      }
    }

    void loadPreview();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [isCameraOn, isMicOn, selectedCamera, selectedMic]);

  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="mx-auto grid max-w-6xl gap-8 p-6">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Ready to join?</h1>
            <p className="text-lg text-muted-foreground">
              Test your devices before entering &quot;{meetingName}&quot;
            </p>
          </div>

          <Card className="relative aspect-video overflow-hidden bg-black p-0">
            {isCameraOn ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="h-full w-full object-cover scale-x-[-1]"
                />
                <div className="absolute bottom-20 left-6">
                  <div className="flex items-center gap-2 rounded-lg bg-black/60 px-4 py-2 text-white backdrop-blur-sm">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      {userName || "Enter your name below"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-gray-800 to-gray-900">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-4xl font-semibold text-white">
                    {initials}
                  </div>
                  <div className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-lg bg-black/60 px-4 py-2 text-white">
                    <User className="h-4 w-4" />
                    <span className="font-medium">
                      {userName || "Enter your name below"}
                    </span>
                  </div>
                  <p className="text-sm text-white/70">Camera is off</p>
                </div>
              </div>
            )}

            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-background/90 p-1 backdrop-blur-sm">
                <Button
                  onClick={() => {
                    setIsCameraOn((value) => !value);
                    setOpenMenu(null);
                  }}
                  variant={isCameraOn ? "ghost" : "destructive"}
                  size="icon-lg"
                  className="rounded-full"
                >
                  {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                </Button>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    onClick={() => setOpenMenu(openMenu === "camera" ? null : "camera")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  {openMenu === "camera" && videoDevices.length > 0 ? (
                    <div className="absolute bottom-full right-0 mb-2 min-w-57.5 rounded-lg border border-border bg-card p-2 shadow-lg">
                      {videoDevices.map((device) => (
                        <button
                          key={device.deviceId}
                          type="button"
                          onClick={() => {
                            setSelectedCamera(device.deviceId);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-muted"
                        >
                          <span className="truncate text-sm">
                            {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                          </span>
                          {selectedCamera === device.deviceId ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-full bg-background/90 p-1 backdrop-blur-sm">
                <Button
                  onClick={() => {
                    setIsMicOn((value) => !value);
                    setOpenMenu(null);
                  }}
                  variant={isMicOn ? "ghost" : "destructive"}
                  size="icon-lg"
                  className="rounded-full"
                >
                  {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </Button>
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="rounded-full"
                    onClick={() => setOpenMenu(openMenu === "mic" ? null : "mic")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  {openMenu === "mic" && audioDevices.length > 0 ? (
                    <div className="absolute bottom-full right-0 mb-2 min-w-57.5 rounded-lg border border-border bg-card p-2 shadow-lg">
                      {audioDevices.map((device) => (
                        <button
                          key={device.deviceId}
                          type="button"
                          onClick={() => {
                            setSelectedMic(device.deviceId);
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center justify-between rounded px-3 py-2 text-left hover:bg-muted"
                        >
                          <span className="truncate text-sm">
                            {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                          </span>
                          {selectedMic === device.deviceId ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="lobby-user-name">
              Your name
            </label>
            <Input
              id="lobby-user-name"
              value={rawUserName}
              onChange={(event) => {
                setHasEditedName(true);
                setUserNameOverride(event.target.value);
              }}
              placeholder="Enter your name to join"
              className="h-12 text-base"
              maxLength={80}
            />
            <p className="text-sm text-muted-foreground">
              Everyone in the meeting will see this name.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() =>
                joinMeetingMutation.mutate({
                  userName,
                  isMicOn,
                  isCameraOn,
                })
              }
              size="lg"
              className="h-14 flex-1 text-lg"
              disabled={joinMeetingMutation.isPending || !canJoinMeeting}
            >
              {joinMeetingMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : null}
              Join now
            </Button>
            <Button
              onClick={() => router.push("/")}
              variant="outline"
              size="lg"
              className="h-14 text-lg"
            >
              Home
            </Button>
          </div>

          {!canJoinMeeting ? (
            <p className="text-sm text-muted-foreground">
              Enter your name to join this meeting.
            </p>
          ) : null}

          {deviceError ? <p className="text-sm text-destructive">{deviceError}</p> : null}
        </div>
      </div>
    </div>
  );
}
