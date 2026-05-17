"use client";

import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";

export function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

type AuthFieldProps = ComponentProps<typeof Input> & {
  label: string;
  errorMessage?: string;
  action?: ReactNode;
};

export function AuthField({
  id,
  label,
  errorMessage,
  action,
  ...inputProps
}: AuthFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm">
        {label}
      </label>
      {action ? (
        <div className="flex gap-2">
          <Input id={id} {...inputProps} />
          {action}
        </div>
      ) : (
        <Input id={id} {...inputProps} />
      )}
      <FieldError message={errorMessage} />
    </div>
  );
}
