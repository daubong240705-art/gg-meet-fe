"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Loader2,
  Mic,
  MicOff,
  User,
  Video,
  VideoOff,
  WifiOff,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthSession } from "@/lib/auth/auth-session";
import { readStoredAccessToken } from "@/lib/auth/auth-token";
import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import {
  clearInstantMeetingSession,
  persistInstantMeetingSession,
  readInstantMeetingSession,
} from "@/lib/meeting/instant-meeting-session";
import {
  connectMeetingSocket,
  type MeetingSocketMessage,
} from "@/lib/meeting/meeting-websocket";
import {
  meetingApi,
  normalizeMeetingParticipantStatus,
  type JoinMeetingResponseData,
  type MeetingParticipantStatus,
} from "@/service/meeting.service";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Homeheader from "../layout/home.header";

type LobbyJoinPayload = {
  userName: string;
  guestId?: string | null;
  isMicOn: boolean;
  isCameraOn: boolean;
  livekitToken?: string | null;
  meetingToken?: string | null;
  participantStatus?: string | null;
  hostId?: string | null;
  hostName?: string | null;
};

type LobbyPendingJoinState = LobbyJoinPayload;

type LobbyProps = {
  meetingCode: string;
  onJoin: (payload: LobbyJoinPayload) => void;
};

export type { LobbyJoinPayload };

const WAITING_APPROVAL_IMAGE_SRC = "/images/waitting.png";

function createGuestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function getApiErrorDescription(error: IBackendRes<unknown>) {
  if (Array.isArray(error.errors)) {
    return error.errors[0];
  }

  if (typeof error.errors === "string") {
    return error.errors;
  }

  if (typeof error.error === "string") {
    return error.error;
  }

  return error.message;
}

function getWaitingMessage(message: MeetingSocketMessage) {
  const action = message.action?.trim().toUpperCase();

  if (action === "ADMITTED") {
    return "The host admitted you to the meeting.";
  }

  if (action === "REJECTED") {
    return "The host declined this join request.";
  }

  return "Waiting for the host to respond.";
}

export default function Lobby({ meetingCode, onJoin }: LobbyProps) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthSession();
  const initialMeetingSession = readInstantMeetingSession(meetingCode);
  const initialParticipantStatus = normalizeMeetingParticipantStatus(
    initialMeetingSession?.participantStatus,
  );
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const waitingSocketRef = useRef<ReturnType<typeof connectMeetingSocket> | null>(null);
  const sessionUserName = user?.fullName?.trim() || user?.email?.trim() || "";
  const initialGuestName = !sessionUserName ? initialMeetingSession?.userName?.trim() || "" : "";
  const [userNameOverride, setUserNameOverride] = useState(initialGuestName);
  const [hasEditedName, setHasEditedName] = useState(Boolean(initialGuestName));
  const [guestId] = useState(() => {
    return initialMeetingSession?.guestId?.trim() || createGuestId();
  });
  const [isCameraOn, setIsCameraOn] = useState(initialMeetingSession?.isCameraOn ?? true);
  const [isMicOn, setIsMicOn] = useState(initialMeetingSession?.isMicOn ?? true);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedMic, setSelectedMic] = useState("");
  const [openMenu, setOpenMenu] = useState<"camera" | "mic" | null>(null);
  const [deviceError, setDeviceError] = useState("");
  const [waitingSocketError, setWaitingSocketError] = useState("");
  const [isWaitingSocketConnected, setIsWaitingSocketConnected] = useState(false);
  const [waitingSocketRetryKey, setWaitingSocketRetryKey] = useState(0);
  const [pendingJoinState, setPendingJoinState] = useState<LobbyPendingJoinState | null>(() => {
    if (!initialMeetingSession || initialParticipantStatus !== "WAITING") {
      return null;
    }

    return {
      userName: initialMeetingSession.userName,
      guestId: initialMeetingSession.guestId ?? null,
      isMicOn: initialMeetingSession.isMicOn,
      isCameraOn: initialMeetingSession.isCameraOn,
      livekitToken: initialMeetingSession.livekitToken ?? null,
      meetingToken: initialMeetingSession.meetingToken ?? null,
      participantStatus: initialParticipantStatus,
      hostId: initialMeetingSession.hostId ?? null,
      hostName: initialMeetingSession.hostName ?? null,
    };
  });

  const hasAccessToken =
    typeof window !== "undefined" ? Boolean(readStoredAccessToken()) : false;
  const isSignedIn = isAuthenticated && hasAccessToken;
  const rawUserName = isSignedIn
    ? sessionUserName
    : hasEditedName
      ? userNameOverride
      : "";
  const userName = rawUserName.trim();
  const displayName = userName || pendingJoinState?.userName?.trim() || "Guest";
  const canJoinMeeting = userName.length > 0;
  const meetingName = meetingCode ? meetingCode.toUpperCase() : "your meeting";
  const initials =
    displayName
      .split(/\s+/)
      .map((part) => part[0] || "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "G";
  const pendingParticipantStatus = normalizeMeetingParticipantStatus(
    pendingJoinState?.participantStatus,
  );
  const isWaitingForApproval = pendingParticipantStatus === "WAITING";
  const isRejected = pendingJoinState !== null && pendingParticipantStatus !== null && pendingParticipantStatus !== "WAITING" && pendingParticipantStatus !== "ACCEPT";

  const persistLobbySession = (
    resolvedMeetingCode: string,
    payload: LobbyJoinPayload,
    participantStatus: MeetingParticipantStatus | null,
  ) => {
    persistInstantMeetingSession({
      meetingCode: resolvedMeetingCode,
      userName: payload.userName,
      guestId: payload.guestId ?? null,
      isMicOn: payload.isMicOn,
      isCameraOn: payload.isCameraOn,
      livekitToken: payload.livekitToken ?? null,
      meetingToken: payload.meetingToken ?? null,
      participantStatus,
      hostId: payload.hostId ?? null,
      hostName: payload.hostName ?? null,
    });
  };

  const requestApprovedJoin = useCallback(async (nextPendingJoinState: LobbyPendingJoinState) => {
    const response = await meetingApi.joinMeeting(
      meetingCode,
      nextPendingJoinState.guestId?.trim() && nextPendingJoinState.userName.trim()
        ? {
          guestId: nextPendingJoinState.guestId.trim(),
          guestName: nextPendingJoinState.userName.trim(),
        }
        : undefined,
    );
    const verifiedResponse = assertApiSuccess(response);
    const participantStatus = normalizeMeetingParticipantStatus(
      verifiedResponse.data?.participantStatus,
    );
    const livekitToken = verifiedResponse.data?.livekitToken?.trim() || null;
    const meetingToken = verifiedResponse.data?.meetingToken?.trim() || nextPendingJoinState.meetingToken || null;
    const resolvedMeetingCode = verifiedResponse.data?.meetingCode?.trim() || meetingCode;
    const approvedJoinPayload: LobbyJoinPayload = {
      ...nextPendingJoinState,
      isMicOn,
      isCameraOn,
      livekitToken,
      meetingToken,
      participantStatus,
      hostId: verifiedResponse.data?.host?.id?.toString() ?? nextPendingJoinState.hostId ?? null,
      hostName: verifiedResponse.data?.host?.fullName?.trim() || nextPendingJoinState.hostName || null,
    };

    if (!livekitToken) {
      throw new Error("The host approved you, but the server did not provide a LiveKit token yet.");
    }

    persistLobbySession(resolvedMeetingCode, approvedJoinPayload, participantStatus);
    return approvedJoinPayload;
  }, [isCameraOn, isMicOn, meetingCode]);

  const joinMeetingMutation = useMutation<
    IBackendRes<JoinMeetingResponseData>,
    IBackendRes<unknown>,
    LobbyJoinPayload
  >({
    mutationFn: async (payload) => {
      const response = await meetingApi.joinMeeting(
        meetingCode,
        payload.guestId?.trim() && payload.userName.trim()
          ? {
            guestId: payload.guestId.trim(),
            guestName: payload.userName.trim(),
          }
          : undefined,
      );
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
        guestId: payload.guestId ?? null,
        hostId: response.data?.host?.id?.toString() ?? null,
        hostName: response.data?.host?.fullName?.trim() || null,
      };

      if (participantStatus === "WAITING") {
        if (!meetingToken) {
          toast.error("Unable to send join request", {
            description: "The server did not return a meeting token for the waiting room.",
          });
          return;
        }

        persistLobbySession(resolvedMeetingCode, nextJoinPayload, participantStatus);
        setIsWaitingSocketConnected(false);
        setPendingJoinState(nextJoinPayload);
        setWaitingSocketError("");
        setWaitingSocketRetryKey((currentValue) => currentValue + 1);
        toast.success("Request sent", {
          description: "Stay on this page while the host reviews your request.",
        });
        return;
      }

      if (!livekitToken) {
        toast.error("Unable to join meeting", {
          description: "The server did not return a valid LiveKit token.",
        });
        return;
      }

      persistLobbySession(resolvedMeetingCode, nextJoinPayload, participantStatus);
      onJoin(nextJoinPayload);
    },
    onError: (error) => {
      toast.error("Unable to join meeting", {
        description: getApiErrorDescription(error) || "Please try again in a moment.",
      });
    },
  });

  useEffect(() => {
    if (!pendingJoinState || !isWaitingForApproval) {
      waitingSocketRef.current?.disconnect();
      waitingSocketRef.current = null;
      return;
    }

    if (!pendingJoinState.meetingToken) {
      return;
    }

    waitingSocketRef.current?.disconnect();
    waitingSocketRef.current = null;

    const connection = connectMeetingSocket({
      meetingCode,
      meetingToken: pendingJoinState.meetingToken,
      subscribeToParticipantTopic: true,
      onConnect: () => {
        setIsWaitingSocketConnected(true);
        setWaitingSocketError("");
      },
      onDisconnect: () => {
        setIsWaitingSocketConnected(false);
      },
      onParticipantMessage: (message) => {
        const action = message.action?.trim().toUpperCase();

        if (action === "ADMITTED") {
          void requestApprovedJoin(pendingJoinState).then((approvedJoinPayload) => {
            toast.success("You were admitted", {
              description: getWaitingMessage(message),
            });
            onJoin(approvedJoinPayload);
          }).catch((error) => {
            const errorMessage =
              error instanceof Error ? error.message : "Unable to finish joining the meeting.";

            setWaitingSocketError(errorMessage);
          });
          return;
        }

        if (action === "REJECTED") {
          clearInstantMeetingSession(meetingCode);
          setPendingJoinState((currentState) => currentState
            ? {
              ...currentState,
              participantStatus: "REJECTED",
            }
            : currentState);
          setIsWaitingSocketConnected(false);
          toast.error("Join request declined", {
            description: getWaitingMessage(message),
          });
        }
      },
      onError: (error) => {
        setIsWaitingSocketConnected(false);
        setWaitingSocketError(error.message);
      },
    });

    waitingSocketRef.current = connection;

    return () => {
      connection.disconnect();

      if (waitingSocketRef.current === connection) {
        waitingSocketRef.current = null;
      }
    };
  }, [isWaitingForApproval, meetingCode, onJoin, pendingJoinState, requestApprovedJoin, waitingSocketRetryKey]);

  useEffect(() => {
    if (!pendingJoinState || !isWaitingForApproval) {
      return;
    }

    persistLobbySession(
      meetingCode,
      {
        ...pendingJoinState,
        userName: pendingJoinState.userName,
        isMicOn,
        isCameraOn,
      },
      "WAITING",
    );
  }, [isCameraOn, isMicOn, isWaitingForApproval, meetingCode, pendingJoinState]);

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

  const renderPreviewCard = () => (
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
                {displayName || "Enter your name below"}
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
                {displayName || "Enter your name below"}
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
  );

  if (isWaitingForApproval && pendingJoinState) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_42%)]" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-card/35 to-transparent" />

        <div className="relative flex w-full max-w-3xl flex-col items-center justify-center text-center">
          {WAITING_APPROVAL_IMAGE_SRC ? (
            <Image
              src={WAITING_APPROVAL_IMAGE_SRC}
              alt="Waiting for host approval"
              width={640}
              height={480}
              priority
              className="h-auto w-full max-w-md object-contain"
            />
          ) : (
            <div className="flex h-72 w-full max-w-md items-center justify-center rounded-[2rem] border border-dashed border-border/70 bg-card/20 px-6 text-sm text-muted-foreground">
              Set your waiting-room image here
            </div>
          )}

          <div className="mt-8 flex items-center gap-2 text-base text-foreground sm:text-lg">
            {isWaitingSocketConnected ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span>Please wait until the meeting host admits you into the call.</span>
          </div>

          {waitingSocketError ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {waitingSocketError}
            </p>
          ) : null}


        </div>
      </div>
    );
  }

  if (isRejected && pendingJoinState) {
    return (
      <div className="min-h-screen bg-background">
        <Homeheader />

        <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-3xl items-center px-6 py-10">
          <Card className="w-full border border-border/70 bg-background/90 p-8 shadow-sm">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <XCircle className="h-7 w-7" />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Request Declined
              </p>
              <h1 className="text-3xl font-semibold tracking-tight">
                The host didn&apos;t admit this request
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                You can go back to the lobby setup and send another request later, or return to the homepage now.
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                className="h-12"
                onClick={() => {
                  setIsWaitingSocketConnected(false);
                  setWaitingSocketError("");
                  setPendingJoinState(null);
                  clearInstantMeetingSession(meetingCode);
                }}
              >
                Request again
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12"
                onClick={() => router.push("/")}
              >
                Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="mx-auto grid max-w-6xl gap-8 p-6">
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Ready to request access?</h1>
            <p className="text-lg text-muted-foreground">
              Test your devices before asking to join &quot;{meetingName}&quot;
            </p>
          </div>

          {renderPreviewCard()}

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
              disabled={isSignedIn}
            />
            <p className="text-sm text-muted-foreground">
              {isSignedIn
                ? "You're signed in, so the meeting will use your account name."
                : "Everyone in the meeting will see this name."}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Button
              onClick={() =>
                joinMeetingMutation.mutate({
                  userName,
                  guestId: isSignedIn ? null : guestId,
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
              Request to join
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
              Enter your name before requesting access to this meeting.
            </p>
          ) : null}

          {deviceError ? <p className="text-sm text-destructive">{deviceError}</p> : null}
        </div>
      </div>
    </div>
  );
}
