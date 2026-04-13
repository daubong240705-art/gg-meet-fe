import { ArrowLeft, Video } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type AuthMode = "sign-in" | "sign-up";

type AuthFormPageProps = {
  mode: AuthMode;
};

const AUTH_COPY: Record<
  AuthMode,
  {
    title: string;
    description: string;
    submitLabel: string;
    alternatePrompt: string;
    alternateLabel: string;
    alternateHref: string;
  }
> = {
  "sign-in": {
    title: "Welcome back",
    description: "Sign in to continue to Meetly",
    submitLabel: "Sign in",
    alternatePrompt: "Don't have an account?",
    alternateLabel: "Sign up",
    alternateHref: "/sign-up",
  },
  "sign-up": {
    title: "Create an account",
    description: "Get started with Meetly today",
    submitLabel: "Create account",
    alternatePrompt: "Already have an account?",
    alternateLabel: "Sign in",
    alternateHref: "/sign-in",
  },
};

export default function AuthFormPage({ mode }: AuthFormPageProps) {
  const copy = AUTH_COPY[mode];
  const isSignUp = mode === "sign-up";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="relative flex min-h-screen items-center justify-center p-6">
        <div className="absolute left-6 top-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </Link>
          </Button>
        </div>

        <div className="absolute right-6 top-6">
          <ThemeToggle />
        </div>

        <Card className="w-full max-w-md p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-primary">
              <Video className="w-9 h-9 text-white" />
            </div>
            <h1 className="mb-2 text-3xl font-bold">{copy.title}</h1>
            <p className="text-muted-foreground">{copy.description}</p>
          </div>

          <div className="space-y-5">
            {isSignUp ? (
              <div>
                <label className="mb-2 block text-sm">Full name</label>
                <Input
                  type="text"
                  placeholder="Giang gay"
                  required
                />
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm">Email address</label>
              <Input
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Password</label>
              <Input
                type="password"
                placeholder="********"
                required
              />
            </div>



            <Button type="button" className="w-full" size="lg">
              {copy.submitLabel}
            </Button>
          </div>

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
