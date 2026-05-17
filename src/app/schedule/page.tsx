"use client";

import Link from "next/link";
import { Calendar, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScheduleFormCard } from "@/components/schedule/schedule-form-card";
import { ScheduleInviteList } from "@/components/schedule/schedule-invite-list";
import { useScheduleMeetingForm } from "@/hooks/meeting/useScheduleMeetingForm";
import {
  formatScheduleSummaryDate,
  formatScheduleSummaryTime,
} from "@/lib/meeting/schedule";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

export default function SchedulePage() {
  const {
    form,
    onSubmit,
    scheduleMeetingMutation,
    hostEmail,
    handleAddParticipant,
    removeParticipant,
  } = useScheduleMeetingForm();
  const {
    register,
    watch,
    formState: { errors, isValid },
  } = form;

  const title = watch("title");
  const date = watch("date");
  const time = watch("time");
  const participantEmail = watch("participantEmail");
  const participants = watch("emailList");

  const summaryTitle = title.trim();
  const summaryDate = formatScheduleSummaryDate(date);
  const summaryTime = formatScheduleSummaryTime(time);
  const isSubmitting = scheduleMeetingMutation.isPending;
  const isAddParticipantDisabled = !participantEmail.trim() || isSubmitting;
  const isScheduleDisabled = !isValid || isSubmitting;

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight">Schedule a meeting</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Set the topic, pick a time, and invite participants in one place.
            </p>
          </div>

          <form onSubmit={onSubmit}>
            <div className="grid gap-8 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <ScheduleFormCard
                  register={register}
                  errors={errors}
                  isSubmitting={isSubmitting}
                />
                <ScheduleInviteList
                  register={register}
                  errors={errors}
                  isSubmitting={isSubmitting}
                  participants={participants}
                  hostEmail={hostEmail}
                  isAddParticipantDisabled={isAddParticipantDisabled}
                  onAdd={() => {
                    void handleAddParticipant();
                  }}
                  onRemove={removeParticipant}
                />
              </div>

              <div className="lg:col-span-1">
                <Card className="sticky top-24 p-6">
                  <h2 className="text-xl font-semibold">Summary</h2>

                  <div className="space-y-4">
                    {summaryTitle ? (
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">Title</p>
                        <p className="font-medium">{summaryTitle}</p>
                      </div>
                    ) : null}

                    {summaryDate ? (
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">Date & Time</p>
                        <p className="font-medium">{summaryDate}</p>
                        {summaryTime ? (
                          <p className="font-medium">{summaryTime}</p>
                        ) : null}
                      </div>
                    ) : null}

                    {participants.length > 0 ? (
                      <div>
                        <p className="mb-1 text-sm text-muted-foreground">Participants</p>
                        <p className="font-medium">{participants.length} invited</p>
                      </div>
                    ) : null}
                  </div>

                  <FieldError
                    message={errors.root?.message ? String(errors.root.message) : undefined}
                  />

                  <div className="space-y-3">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isScheduleDisabled}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Scheduling...
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4" />
                          Schedule Meeting
                        </>
                      )}
                    </Button>
                    <Button asChild variant="ghost" className="w-full">
                      <Link href="/">Cancel</Link>
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
