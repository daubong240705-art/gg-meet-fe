import type { FieldErrors, UseFormRegister } from "react-hook-form";

import { Input } from "@/components/ui/input";
import type { ScheduleMeetingFormValues } from "@/lib/meeting/schedule";

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

type ScheduleDateTimeFieldsProps = {
  register: UseFormRegister<ScheduleMeetingFormValues>;
  errors: FieldErrors<ScheduleMeetingFormValues>;
  isSubmitting: boolean;
};

export function ScheduleDateTimeFields({
  register,
  errors,
  isSubmitting,
}: ScheduleDateTimeFieldsProps) {
  return (
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
  );
}
