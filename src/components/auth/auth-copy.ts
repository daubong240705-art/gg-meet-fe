export type AuthMode = "sign-in" | "sign-up";

export const AUTH_COPY = {
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

export type AuthCopy = (typeof AUTH_COPY)[keyof typeof AUTH_COPY];
