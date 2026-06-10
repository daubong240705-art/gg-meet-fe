"use client";

import { useSearchParams } from "next/navigation";

import MeetingPageClient from "@/components/meeting/meeting-page-client";

export default function JoinPageClient() {
  const meetingCode = useSearchParams().get("code")?.trim() ?? "";

  return <MeetingPageClient key={meetingCode} meetingCode={meetingCode} />;
}
