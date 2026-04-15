"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, PlayCircle, Plus, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuthSession } from "@/lib/auth/auth-session";
import { persistInstantMeetingSession } from "@/lib/meeting/instant-meeting-session";
import { assertApiSuccess } from "@/hooks/shared/mutation.utils";
import { meetingApi, type CreateMeetingResponseData } from "@/service/meeting.service";

import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export default function QuickAction() {
    const router = useRouter();
    const { user } = useAuthSession();
    const [meetingCodeInput, setMeetingCodeInput] = useState("");

    const createMeetingMutation = useMutation<IBackendRes<CreateMeetingResponseData>, IBackendRes<unknown>, void>({
        mutationFn: async () => {
            const response = await meetingApi.createInstantMeeting();
            return assertApiSuccess(response);
        },
        onSuccess: (response) => {
            const meetingCode = response.data?.meetingCode?.trim();

            if (!meetingCode) {
                toast.error("Unable to start meeting", {
                    description: "The server did not return a valid meeting code.",
                });
                return;
            }

            persistInstantMeetingSession({
                meetingCode,
                userName: user?.fullName?.trim() || response.data?.host?.fullName?.trim() || "Guest",
                isMicOn: true,
                isCameraOn: true,
                livekitToken: response.data?.livekitToken ?? null,
                hostId: response.data?.host?.id?.toString() ?? null,
                hostName: response.data?.host?.fullName?.trim() || null,
            });

            router.push(`/${meetingCode}`);
        },
        onError: (error) => {
            const errorDescription = Array.isArray(error.errors)
                ? error.errors[0]
                : typeof error.errors === "string"
                    ? error.errors
                    : typeof error.error === "string"
                        ? error.error
                        : error.message;

            toast.error("Unable to start meeting", {
                description: errorDescription || "Please try again in a moment.",
            });
        },
    });

    const handleJoinMeeting = () => {
        const meetingCode = meetingCodeInput.trim();

        if (!meetingCode) {
            toast.error("Enter a meeting code", {
                description: "Add a valid code before joining the meeting.",
            });
            return;
        }

        router.push(`/${meetingCode}`);
    };

    return (
        <div className="grid md:grid-cols-2 gap-6 mb-12">
            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Video className="w-5 h-5 text-primary" />
                    Start a new meeting
                </h2>
                <p className="text-muted-foreground mb-6">
                    Create an instant meeting and invite participants
                </p>
                <Button
                    size="lg"
                    className="w-full"
                    onClick={() => createMeetingMutation.mutate()}
                    disabled={createMeetingMutation.isPending}
                >
                    {createMeetingMutation.isPending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <PlayCircle className="w-5 h-5" />
                    )}
                    Start instant meeting
                </Button>
            </Card>

            <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" />
                    Join a meeting
                </h2>
                <p className="text-muted-foreground mb-4">
                    Enter a meeting code to join
                </p>
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter meeting code"
                        value={meetingCodeInput}
                        onChange={(event) => setMeetingCodeInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") {
                                handleJoinMeeting();
                            }
                        }}
                    />
                    <Button onClick={handleJoinMeeting}>
                        Join
                    </Button>
                </div>
            </Card>
        </div>
    )
}
