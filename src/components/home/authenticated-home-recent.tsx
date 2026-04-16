"use client";

import { ArrowRight, Calendar, History } from "lucide-react";

import { recentMeetings } from "./authenticated-home.data";
import AuthenticatedMeetingCodeButton from "./authenticated-meeting-code-button";
import { Button } from "../ui/button";
import { Card } from "../ui/card";

export default function AuthenticatedHomeRecent() {
  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Recent meetings</h2>
          <p className="mt-1 text-sm text-muted-foreground">A quick view of rooms you visited recently.</p>
        </div>
        <Button variant="ghost" size="sm">
          View all
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {recentMeetings.map((meeting) => (
          <Card key={meeting.id} className="rounded-[1.75rem] border-border/70 p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <History className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{meeting.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {meeting.date} - {meeting.duration} - {meeting.participants} people
                </p>
              </div>
              <AuthenticatedMeetingCodeButton code={meeting.code} />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6 rounded-[1.75rem] border-amber-200/60 bg-[linear-gradient(135deg,rgba(255,251,235,0.95),rgba(255,237,213,0.95))] p-5 shadow-sm dark:border-amber-900/40 dark:bg-[linear-gradient(135deg,rgba(120,53,15,0.22),rgba(154,52,18,0.18))]">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold">Pro tip</h4>
            <p className="mt-1 text-sm text-muted-foreground">
              If you plan to bring scheduling back later, this card is a clean placeholder for that product flow.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
