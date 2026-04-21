"use client";

import Link from "next/link";
import { Calendar, Loader2, Plus, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useScheduleMeetingForm } from "@/hooks/meeting/useScheduleMeetingForm";
import {
    formatScheduleSummaryDate,
    formatScheduleSummaryTime,
} from "@/lib/meeting/schedule";
import { getAvatarInitials } from "@/lib/user/avatar";

function FieldError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

export default function SchedulePage() {
    const { form, onSubmit, scheduleMeetingMutation, hostEmail, handleAddParticipant, removeParticipant } =
        useScheduleMeetingForm();
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
                                <Card className="p-6">
                                    <h2 className="mb-6 text-xl font-semibold">Meeting Details</h2>

                                    <div className="space-y-5">
                                        <div>
                                            <label htmlFor="meeting-title" className="mb-2 block text-sm">
                                                Meeting title *
                                            </label>
                                            <Input
                                                id="meeting-title"
                                                type="text"
                                                placeholder="e.g., Weekly Team Sync"
                                                aria-invalid={Boolean(errors.title)}
                                                disabled={isSubmitting}
                                                {...register("title")}
                                            />
                                            <FieldError
                                                message={errors.title?.message ? String(errors.title.message) : undefined}
                                            />
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <label htmlFor="meeting-date" className="mb-2 block text-sm">
                                                    Date *
                                                </label>
                                                <Input
                                                    id="meeting-date"
                                                    type="date"
                                                    aria-invalid={Boolean(errors.date)}
                                                    disabled={isSubmitting}
                                                    {...register("date")}
                                                />
                                                <FieldError
                                                    message={errors.date?.message ? String(errors.date.message) : undefined}
                                                />
                                            </div>

                                            <div>
                                                <label htmlFor="meeting-time" className="mb-2 block text-sm">
                                                    Time *
                                                </label>
                                                <Input
                                                    id="meeting-time"
                                                    type="time"
                                                    aria-invalid={Boolean(errors.time)}
                                                    disabled={isSubmitting}
                                                    {...register("time")}
                                                />
                                                <FieldError
                                                    message={errors.time?.message ? String(errors.time.message) : undefined}
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="meeting-description" className="mb-2 block text-sm">
                                                Description (optional)
                                            </label>
                                            <textarea
                                                id="meeting-description"
                                                rows={4}
                                                placeholder="Add meeting agenda or description..."
                                                aria-invalid={Boolean(errors.description)}
                                                disabled={isSubmitting}
                                                className="w-full resize-none rounded-lg border border-input bg-input-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-ring"
                                                {...register("description")}
                                            />
                                            <FieldError
                                                message={
                                                    errors.description?.message
                                                        ? String(errors.description.message)
                                                        : undefined
                                                }
                                            />
                                        </div>
                                    </div>
                                </Card>

                                <Card className="mb-20 p-6">
                                    <h2 className="mb-6 flex items-center gap-2 text-xl font-semibold">
                                        <Users className="h-5 w-5 text-primary" />
                                        Participants
                                    </h2>

                                    <div className="space-y-4">
                                        <div className="flex gap-2">
                                            <Input
                                                id="participant-email"
                                                type="email"
                                                placeholder="Enter email address"
                                                aria-invalid={Boolean(errors.participantEmail || errors.emailList)}
                                                disabled={isSubmitting}
                                                {...register("participantEmail")}
                                                onKeyDown={(event) => {
                                                    if (event.key !== "Enter") {
                                                        return;
                                                    }

                                                    event.preventDefault();
                                                    void handleAddParticipant();
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                onClick={() => {
                                                    void handleAddParticipant();
                                                }}
                                                disabled={isAddParticipantDisabled}
                                            >
                                                <Plus className="h-4 w-4" />
                                                Add
                                            </Button>
                                        </div>
                                        <FieldError
                                            message={
                                                errors.participantEmail?.message
                                                    ? String(errors.participantEmail.message)
                                                    : undefined
                                            }
                                        />
                                        <FieldError
                                            message={
                                                errors.emailList?.message
                                                    ? String(errors.emailList.message)
                                                    : undefined
                                            }
                                        />

                                        {participants.length > 0 ? (
                                            <div className="space-y-2">
                                                <p className="text-sm text-muted-foreground">
                                                    {participants.length} participant
                                                    {participants.length !== 1 ? "s" : ""} added
                                                </p>
                                                <div className="space-y-2">
                                                    {participants.map((email) => {
                                                        const isHostParticipant =
                                                            Boolean(hostEmail)
                                                            && email.toLowerCase() === hostEmail.toLowerCase();

                                                        return (
                                                            <div
                                                                key={email}
                                                                className="flex items-center justify-between rounded-lg bg-muted p-3"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                                                                        {getAvatarInitials(email, "P")}
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <span className="block text-sm">{email}</span>
                                                                        {isHostParticipant ? (
                                                                            <span className="inline-flex rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                                                                                Host
                                                                            </span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>

                                                                {isHostParticipant ? null : (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeParticipant(email)}
                                                                        className="text-muted-foreground transition-colors hover:text-destructive"
                                                                        disabled={isSubmitting}
                                                                        aria-label={`Remove ${email}`}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </Card>
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
                                                {summaryTime ? <p className="font-medium">{summaryTime}</p> : null}
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
                                        <Button type="submit" className="w-full" disabled={isScheduleDisabled}>
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
