"use client";

import {
  useLoginForm,
  useLoginMutation,
} from "@/hooks/auth/useLoginForm";
import type { LoginForm } from "@/types/form.type";

import type { AuthCopy } from "./auth-copy";
import { AuthField, FieldError } from "./auth-fields";
import { AuthSubmitSection } from "./auth-submit-section";

type SignInFormProps = {
  copy: AuthCopy;
};

export function SignInForm({ copy }: SignInFormProps) {
  const form = useLoginForm();
  const mutation = useLoginMutation(form);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = (values: LoginForm) => {
    mutation.mutate(values);
  };

  return (
    <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
      <FieldError message={errors.root?.message ? String(errors.root.message) : undefined} />

      <AuthField
        id="sign-in-email"
        label="Email address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        aria-invalid={Boolean(errors.email)}
        errorMessage={errors.email?.message ? String(errors.email.message) : undefined}
        {...register("email")}
      />

      <AuthField
        id="sign-in-password"
        label="Password"
        type="password"
        placeholder="********"
        autoComplete="current-password"
        aria-invalid={Boolean(errors.password)}
        errorMessage={errors.password?.message ? String(errors.password.message) : undefined}
        {...register("password")}
      />

      <AuthSubmitSection
        submitLabel={copy.submitLabel}
        pendingLabel={copy.pendingLabel}
        isPending={mutation.isPending}
      />
    </form>
  );
}
