"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

import {
  clearInstantMeetingSession,
  readInstantMeetingSession,
} from "@/lib/meeting/instant-meeting-session";
import Lobby, { type LobbyJoinPayload } from "@/components/meeting/lobby";
import MeetingRoom from "@/components/meeting/room/room";

export default function MeetingPage() {
  const params = useParams<{ meetingCode: string }>();
  const meetingCode = Array.isArray(params?.meetingCode)
    ? params.meetingCode[0]
    : params?.meetingCode || "";

  return <MeetingPageContent key={meetingCode} meetingCode={meetingCode} />;
}

type MeetingPageContentProps = {
  meetingCode: string;
};

type MeetingJoinState = LobbyJoinPayload;

function MeetingPageContent({ meetingCode }: MeetingPageContentProps) {
  const [joinState, setJoinState] = useState<MeetingJoinState | null>(() => {
    if (!meetingCode) {
      return null;
    }

    const pendingSession = readInstantMeetingSession(meetingCode);

    if (!pendingSession) {
      return null;
    }

    return {
      userName: pendingSession.userName,
      isMicOn: pendingSession.isMicOn,
      isCameraOn: pendingSession.isCameraOn,
      livekitToken: pendingSession.livekitToken ?? null,
      meetingToken: pendingSession.meetingToken ?? null,
      participantStatus: pendingSession.participantStatus ?? null,
    };
  });

  if (!joinState) {
    return <Lobby meetingCode={meetingCode} onJoin={setJoinState} />;
  }

  return (
    <MeetingRoom
      meetingCode={meetingCode}
      userName={joinState.userName}
      isMicOn={joinState.isMicOn}
      isCameraOn={joinState.isCameraOn}
      livekitToken={joinState.livekitToken}
      onLeave={() => {
        clearInstantMeetingSession(meetingCode);
        setJoinState(null);
      }}
    />
  );
}
