"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  useSendVerifyCodeMutation,
  useSignupForm,
  useSignupMutation,
} from "@/hooks/auth/useLoginForm";
import type { SignupForm } from "@/types/form.type";

import type { AuthCopy } from "./auth-copy";
import { AuthField, FieldError } from "./auth-fields";
import { AuthSubmitSection } from "./auth-submit-section";

type SignUpFormProps = {
  copy: AuthCopy;
};

export function SignUpForm({ copy }: SignUpFormProps) {
  const form = useSignupForm();
  const mutation = useSignupMutation(form);
  const sendCodeMutation = useSendVerifyCodeMutation(form);
  const {
    clearErrors,
    register,
    handleSubmit,
    resetField,
    setError,
    trigger,
    watch,
    formState: { errors },
  } = form;
  const emailValue = watch("email");
  const [codeSentTo, setCodeSentTo] = useState("");
  const [cooldownRemaining, setCooldownRemaining] = useState(0);

  const isCodeSent = Boolean(codeSentTo);
  const isSendingCode = sendCodeMutation.isPending;
  const isSubmitting = mutation.isPending;
  const normalizedEmailValue = useMemo(() => emailValue.trim(), [emailValue]);
  const emailField = register("email");
  const verifyCodeField = register("verifyCode");

  useEffect(() => {
    if (cooldownRemaining <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCooldownRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [cooldownRemaining]);

  const handleEmailChange = (event: ChangeEvent<HTMLInputElement>) => {
    emailField.onChange(event);

    const nextEmailValue = event.currentTarget.value.trim();

    if (!codeSentTo || nextEmailValue === codeSentTo) {
      return;
    }

    setCodeSentTo("");
    setCooldownRemaining(0);
    resetField("verifyCode", { defaultValue: "" });
    clearErrors("verifyCode");
  };

  const handleSendCode = async () => {
    clearErrors("root");

    const isEmailValid = await trigger("email");

    if (!isEmailValid) {
      return;
    }

    resetField("verifyCode", { defaultValue: "" });

    sendCodeMutation.mutate(normalizedEmailValue, {
      onSuccess: () => {
        setCodeSentTo(normalizedEmailValue);
        setCooldownRemaining(60);
      },
    });
  };

  const handleCreateAccount = async (values: SignupForm) => {
    if (!values.verifyCode.trim()) {
      setError("verifyCode", {
        type: "manual",
        message: "Verification code must be exactly 6 digits.",
      });
      return;
    }

    mutation.mutate(values);
  };

  const sendCodeLabel = isSendingCode
    ? "Sending..."
    : isCodeSent
      ? cooldownRemaining > 0
        ? `Resend in ${cooldownRemaining}s`
        : "Resend code"
      : "Send code";

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleCreateAccount)}>
      <FieldError message={errors.root?.message ? String(errors.root.message) : undefined} />

      <AuthField
        id="sign-up-full-name"
        label="Full name"
        type="text"
        placeholder="Alex Johnson"
        autoComplete="name"
        aria-invalid={Boolean(errors.fullName)}
        disabled={isSubmitting}
        errorMessage={errors.fullName?.message ? String(errors.fullName.message) : undefined}
        {...register("fullName")}
      />

      <AuthField
        id="sign-up-email"
        label="Email address"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        aria-invalid={Boolean(errors.email)}
        disabled={isSubmitting}
        errorMessage={errors.email?.message ? String(errors.email.message) : undefined}
        {...emailField}
        onChange={handleEmailChange}
        action={(
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            disabled={isSubmitting || isSendingCode || (isCodeSent && cooldownRemaining > 0)}
            onClick={handleSendCode}
          >
            {isSendingCode ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Sending...
              </>
            ) : (
              sendCodeLabel
            )}
          </Button>
        )}
      />

      {isCodeSent ? (
        <AuthField
          id="sign-up-verify-code"
          label="Verification code"
          type="text"
          inputMode="numeric"
          placeholder="123456"
          maxLength={6}
          autoComplete="one-time-code"
          aria-invalid={Boolean(errors.verifyCode)}
          disabled={isSubmitting}
          errorMessage={errors.verifyCode?.message ? String(errors.verifyCode.message) : undefined}
          {...verifyCodeField}
          onInput={(event) => {
            event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 6);
            verifyCodeField.onChange(event);
          }}
        />
      ) : null}

      <AuthField
        id="sign-up-password"
        label="Password"
        type="password"
        placeholder="********"
        autoComplete="new-password"
        aria-invalid={Boolean(errors.password)}
        disabled={isSubmitting}
        errorMessage={errors.password?.message ? String(errors.password.message) : undefined}
        {...register("password")}
      />

      <AuthField
        id="sign-up-confirm-password"
        label="Confirm password"
        type="password"
        placeholder="********"
        autoComplete="new-password"
        aria-invalid={Boolean(errors.confirmPassword)}
        disabled={isSubmitting}
        errorMessage={errors.confirmPassword?.message ? String(errors.confirmPassword.message) : undefined}
        {...register("confirmPassword")}
      />

      <AuthSubmitSection
        submitLabel={copy.submitLabel}
        pendingLabel={copy.pendingLabel}
        isPending={isSubmitting}
        disabled={!isCodeSent}
      />
    </form>
  );
}
