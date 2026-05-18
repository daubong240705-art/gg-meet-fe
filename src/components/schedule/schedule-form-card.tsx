import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ScheduleMeetingFormValues } from "@/lib/meeting/schedule";

import { ScheduleDateTimeFields } from "./schedule-date-time-fields";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

type ScheduleFormCardProps = {
  register: UseFormRegister<ScheduleMeetingFormValues>;
  errors: FieldErrors<ScheduleMeetingFormValues>;
  isSubmitting: boolean;
};

export function ScheduleFormCard({
  register,
  errors,
  isSubmitting,
}: ScheduleFormCardProps) {
  return (
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

        <ScheduleDateTimeFields
          register={register}
          errors={errors}
          isSubmitting={isSubmitting}
        />

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
  );
}
