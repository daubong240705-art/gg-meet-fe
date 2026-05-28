import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import Homeheader from "@/components/layout/home.header";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page Not Found",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <Homeheader />

      <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-4xl flex-col items-center justify-center px-6 py-12 text-center">
        <div className="w-full space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
            404
          </p>
          <h1 className="text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
            Page not found
          </h1>

          <Image
            src="/images/frog-520.webp"
            alt="Page not found illustration"
            width={520}
            height={520}
            priority
            sizes="(min-width: 640px) 448px, calc(100vw - 48px)"
            className="mx-auto mb-8 block h-auto w-full max-w-sm object-contain sm:max-w-md"
          />

          <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            The page you are looking for does not exist or may have been moved.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="min-w-44">
            <Link href="/">Go to homepage</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
