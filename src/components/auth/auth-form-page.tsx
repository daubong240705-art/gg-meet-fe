"use client";

import { AUTH_COPY, type AuthMode } from "./auth-copy";
import { AuthFormShell } from "./auth-form-shell";
import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";

type AuthFormPageProps = {
  mode: AuthMode;
};

export default function AuthFormPage({ mode }: AuthFormPageProps) {
  const copy = AUTH_COPY[mode];

  return (
    <AuthFormShell copy={copy}>
      {mode === "sign-up" ? <SignUpForm copy={copy} /> : <SignInForm copy={copy} />}
    </AuthFormShell>
  );
}
