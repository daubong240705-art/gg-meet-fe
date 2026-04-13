"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import Lobby, { type LobbyJoinPayload } from "@/components/meeting/lobby";
import MeetingRoom from "@/components/meeting/room/room";

export default function MeetingPage() {
  const params = useParams<{ meetingCode: string }>();
  const meetingCode = Array.isArray(params?.meetingCode)
    ? params.meetingCode[0]
    : params?.meetingCode || "";
  const [joinState, setJoinState] = useState<LobbyJoinPayload | null>(null);

  if (!joinState) {
    return <Lobby meetingCode={meetingCode} onJoin={setJoinState} />;
  }

  return (
    <MeetingRoom
      meetingCode={meetingCode}
      userName={joinState.userName}
      isMicOn={joinState.isMicOn}
      isCameraOn={joinState.isCameraOn}
      onLeave={() => setJoinState(null)}
    />
  );
}
