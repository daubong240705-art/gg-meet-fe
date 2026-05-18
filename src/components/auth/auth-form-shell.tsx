"use client";

import { ArrowLeft, Video } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { AuthCopy } from "./auth-copy";

type AuthFormShellProps = {
  copy: AuthCopy;
  children: ReactNode;
};

export function AuthFormShell({ copy, children }: AuthFormShellProps) {
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
