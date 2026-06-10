"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, LogIn, UserPlus, Video } from "lucide-react";
import { toast } from "sonner";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import { meetingHref } from "@/lib/meeting/meeting-path";
import {
  getMeetingApiErrorDescription,
  isMeetingNotFoundError,
  meetingApi,
  type VerifyMeetingResponseData,
} from "@/shared/services/meeting.service";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function DesktopGuestHome() {
  const router = useRouter();
  const [meetingCode, setMeetingCode] = useState("");
  const verifyMeetingMutation = useMutation<
    IBackendRes<VerifyMeetingResponseData | null>,
    IBackendRes<unknown>,
    string
  >({
    mutationFn: async (rawMeetingCode) => {
      const response = await meetingApi.verifyMeeting(rawMeetingCode.trim());
      return assertApiSuccess(response);
    },
    onSuccess: (response, rawMeetingCode) => {
      const resolvedMeetingCode = response.data?.meetingCode?.trim() || rawMeetingCode.trim();
      router.push(meetingHref(resolvedMeetingCode));
    },
    onError: (error) => {
      const title = isMeetingNotFoundError(error)
        ? "Meeting not found"
        : "Unable to verify meeting";
      const fallbackDescription = isMeetingNotFoundError(error)
        ? "Check the code and try again."
        : "Please try again in a moment.";

      toast.error(title, {
        description: getMeetingApiErrorDescription(error) || fallbackDescription,
      });
    },
  });

  const handleJoinMeeting = () => {
    const normalizedMeetingCode = meetingCode.trim();

    if (!normalizedMeetingCode) {
      toast.error("Enter a meeting code", {
        description: "Please add a valid code to continue.",
      });
      return;
    }

    verifyMeetingMutation.mutate(normalizedMeetingCode);
  };

  return (
    <div className="flex min-h-[calc(100vh-9rem)] items-center justify-center bg-background px-6 py-12">
      <section className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[0_18px_50px_-28px_rgba(99,102,241,0.9)]">
            <Video className="size-8" />
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.55)] sm:p-8">
          <div className="mb-7 text-center">
            <h1 className="text-3xl font-semibold tracking-normal text-foreground">
              Join a Kallio room
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Enter a meeting code, or sign in to start and manage your own meetings.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              value={meetingCode}
              onChange={(event) => setMeetingCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleJoinMeeting();
                }
              }}
              disabled={verifyMeetingMutation.isPending}
              placeholder="Enter meeting code"
              className="h-12 text-center text-base"
              autoFocus
            />

            <Button
              type="button"
              size="lg"
              className="h-12 w-full"
              onClick={handleJoinMeeting}
              disabled={verifyMeetingMutation.isPending}
            >
              {verifyMeetingMutation.isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <Video className="size-5" />
              )}
              Join room
            </Button>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" className="h-11">
              <Link href="/sign-in">
                <LogIn className="size-4" />
                Sign in
              </Link>
            </Button>
            <Button asChild variant="secondary" className="h-11">
              <Link href="/sign-up">
                <UserPlus className="size-4" />
                Sign up
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
