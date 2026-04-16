"use client";

import Link from "next/link";
import { ArrowRight, Clock, Users } from "lucide-react";

import { upcomingMeetings } from "./authenticated-home.data";
import AuthenticatedMeetingCodeButton from "./authenticated-meeting-code-button";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export default function AuthenticatedHomeUpcoming() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Upcoming meetings</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your next conversations and shared links.</p>
        </div>
        <Button variant="ghost" size="sm">
          View all
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {upcomingMeetings.map((meeting) => (
          <Card key={meeting.id} className="rounded-[1.75rem] border-border/70 p-6 shadow-sm">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-semibold">{meeting.title}</h3>
                    {meeting.isUrgent ? (
                      <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
                        Urgent
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{meeting.time}</span>
                      <span className="text-primary">- {meeting.timeRemaining}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{meeting.participants} participants</span>
                      <span>- Host: {meeting.host}</span>
                    </p>
                  </div>
                </div>
                <AuthenticatedMeetingCodeButton code={meeting.code} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex -space-x-2">
                  {meeting.avatars.map((avatar) => (
                    <div
                      key={`${meeting.id}-${avatar}`}
                      className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-background bg-primary/10 text-xs font-semibold text-primary"
                    >
                      {avatar}
                    </div>
                  ))}
                </div>

                <Button asChild>
                  <Link href={`/${meeting.code}`}>Join</Link>
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
