"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Loader2, Shield, Users, Video, Zap } from "lucide-react";
import { toast } from "sonner";

import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import {
    getMeetingApiErrorDescription,
    isMeetingNotFoundError,
    meetingApi,
    type VerifyMeetingResponseData,
} from "@/service/meeting.service";

import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function HeroSection() {
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
            router.push(`/${resolvedMeetingCode}`);
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
        <section className="max-w-7xl mx-auto px-6 py-20 md:py-32">
            <div className="text-center max-w-4xl mx-auto">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 leading-tight">
                    Connect, collaborate,<br />anywhere you are
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed">
                    Professional video meetings for students, companies, and remote teams.
                    Simple, secure, and seamless.
                </p>

                <div className="mx-auto mb-12 max-w-2xl rounded-[2rem] border border-border/70 bg-background/85 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Input
                            placeholder="Enter meeting code to join"
                            value={meetingCode}
                            onChange={(event) => setMeetingCode(event.target.value)}
                            disabled={verifyMeetingMutation.isPending}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    handleJoinMeeting();
                                }
                            }}
                            className="h-12 flex-1 rounded-2xl"
                        />
                        <Button
                            size="lg"
                            className="h-12 rounded-2xl sm:px-8"
                            onClick={handleJoinMeeting}
                            disabled={verifyMeetingMutation.isPending}
                        >
                            {verifyMeetingMutation.isPending ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Video className="w-5 h-5" />
                            )}
                            Join room
                        </Button>
                    </div>

                    {/* <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                        <span>Want to host your own meeting?</span>
                        <Link href="/sign-in" className="font-medium text-primary transition hover:text-primary/80">
                            Sign in to start one
                        </Link>
                    </div> */}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        <span>End-to-end encrypted</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>Up to 20 participants</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        <span>HD quality</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
