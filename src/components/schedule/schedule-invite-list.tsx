import { Plus, Users, X } from "lucide-react";
import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ScheduleMeetingFormValues } from "@/lib/meeting/schedule";
import { getAvatarInitials } from "@/lib/user/avatar";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

type ScheduleInviteListProps = {
  register: UseFormRegister<ScheduleMeetingFormValues>;
  errors: FieldErrors<ScheduleMeetingFormValues>;
  isSubmitting: boolean;
  participants: string[];
  hostEmail: string;
  isAddParticipantDisabled: boolean;
  onAdd: () => void;
  onRemove: (email: string) => void;
};

export function ScheduleInviteList({
  register,
  errors,
  isSubmitting,
  participants,
  hostEmail,
  isAddParticipantDisabled,
  onAdd,
  onRemove,
}: ScheduleInviteListProps) {
  return (
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
              onAdd();
            }}
          />
          <Button
            type="button"
            onClick={onAdd}
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
                  Boolean(hostEmail) &&
                  email.toLowerCase() === hostEmail.toLowerCase();

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
                        onClick={() => onRemove(email)}
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
  );
}
