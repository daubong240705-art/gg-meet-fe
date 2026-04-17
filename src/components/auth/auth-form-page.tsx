"use client";

import { ArrowLeft, Loader2, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";

import {
  useLoginForm,
  useLoginMutation,
  useSendVerifyCodeMutation,
  useSignupForm,
  useSignupMutation,
} from "@/hooks/auth/useLoginForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { LoginForm, SignupForm } from "@/types/form.type";

type AuthMode = "sign-in" | "sign-up";

type AuthFormPageProps = {
  mode: AuthMode;
};

type AuthCopy = (typeof AUTH_COPY)[keyof typeof AUTH_COPY];

const AUTH_COPY = {
  "sign-in": {
    title: "Welcome back",
    description: "Sign in to continue to Meetly",
    submitLabel: "Sign in",
    pendingLabel: "Signing in...",
    alternatePrompt: "Don't have an account?",
    alternateLabel: "Sign up",
    alternateHref: "/sign-up",
  },
  "sign-up": {
    title: "Create an account",
    description: "Get started with Meetly today",
    submitLabel: "Create account",
    pendingLabel: "Creating account...",
    alternatePrompt: "Already have an account?",
    alternateLabel: "Sign in",
    alternateHref: "/sign-in",
  },
} as const;

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-destructive">{message}</p>;
}

function AuthCardShell({
  copy,
  children,
}: {
  copy: AuthCopy;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-linear-to-br from-background via-muted/30 to-background">
      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="absolute left-6 top-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>

        <Card className="w-full max-w-md p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
              <Video className="h-9 w-9 text-white" />
            </div>
            <h1 className="mb-2 text-3xl font-bold">{copy.title}</h1>
            <p className="text-muted-foreground">{copy.description}</p>
          </div>

          {children}

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{copy.alternatePrompt}</span>{" "}
            <Link href={copy.alternateHref} className="font-medium text-primary hover:underline">
              {copy.alternateLabel}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function SignInForm({ copy }: { copy: AuthCopy }) {
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

      <div>
        <label htmlFor="sign-in-email" className="mb-2 block text-sm">
          Email address
        </label>
        <Input
          id="sign-in-email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
        <FieldError message={errors.email?.message ? String(errors.email.message) : undefined} />
      </div>

      <div>
        <label htmlFor="sign-in-password" className="mb-2 block text-sm">
          Password
        </label>
        <Input
          id="sign-in-password"
          type="password"
          placeholder="********"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
        <FieldError message={errors.password?.message ? String(errors.password.message) : undefined} />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={mutation.isPending}>
        {mutation.isPending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {copy.pendingLabel}
          </>
        ) : (
          copy.submitLabel
        )}
      </Button>
    </form>
  );
}

function SignUpForm({ copy }: { copy: AuthCopy }) {
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

  const onSubmit = (values: SignupForm) => {
    mutation.mutate(values);
  };

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

    onSubmit(values);
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

      <div>
        <label htmlFor="sign-up-full-name" className="mb-2 block text-sm">
          Full name
        </label>
        <Input
          id="sign-up-full-name"
          type="text"
          placeholder="Alex Johnson"
          autoComplete="name"
          aria-invalid={Boolean(errors.fullName)}
          disabled={isSubmitting}
          {...register("fullName")}
        />
        <FieldError message={errors.fullName?.message ? String(errors.fullName.message) : undefined} />
      </div>

      <div>
        <label htmlFor="sign-up-email" className="mb-2 block text-sm">
          Email address
        </label>
        <div className="flex gap-2">
          <Input
            id="sign-up-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            disabled={isSubmitting}
            {...emailField}
            onChange={handleEmailChange}
          />
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
        </div>
        <FieldError message={errors.email?.message ? String(errors.email.message) : undefined} />
      </div>

      {isCodeSent ? (
        <div>
          <label htmlFor="sign-up-verify-code" className="mb-2 block text-sm">
            Verification code
          </label>
          <Input
            id="sign-up-verify-code"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            maxLength={6}
            autoComplete="one-time-code"
            aria-invalid={Boolean(errors.verifyCode)}
            disabled={isSubmitting}
            {...verifyCodeField}
            onInput={(event) => {
              event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 6);
              verifyCodeField.onChange(event);
            }}
          />
          <FieldError
            message={errors.verifyCode?.message ? String(errors.verifyCode.message) : undefined}
          />
        </div>
      ) : null}

      <div>
        <label htmlFor="sign-up-password" className="mb-2 block text-sm">
          Password
        </label>
        <Input
          id="sign-up-password"
          type="password"
          placeholder="********"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          disabled={isSubmitting}
          {...register("password")}
        />
        <FieldError message={errors.password?.message ? String(errors.password.message) : undefined} />
      </div>

      <div>
        <label htmlFor="sign-up-confirm-password" className="mb-2 block text-sm">
          Confirm password
        </label>
        <Input
          id="sign-up-confirm-password"
          type="password"
          placeholder="********"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirmPassword)}
          disabled={isSubmitting}
          {...register("confirmPassword")}
        />
        <FieldError
          message={errors.confirmPassword?.message ? String(errors.confirmPassword.message) : undefined}
        />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting || !isCodeSent}>
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            {copy.pendingLabel}
          </>
        ) : (
          copy.submitLabel
        )}
      </Button>
    </form>
  );
}

export default function AuthFormPage({ mode }: AuthFormPageProps) {
  const copy = AUTH_COPY[mode];

  return (
    <AuthCardShell copy={copy}>
      {mode === "sign-up" ? <SignUpForm copy={copy} /> : <SignInForm copy={copy} />}
    </AuthCardShell>
  );
}
