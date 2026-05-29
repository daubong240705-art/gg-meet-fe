"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthSession } from "@/lib/auth/auth-session";
import { Button } from "@/components/ui/button";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const { user } = useAuthSession();

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted && !user) {
            router.replace("/sign-in");
        }
    }, [mounted, user, router]);

    if (!mounted || !user) return null;

    if (user.role !== "ADMIN") {
        return (
            <div className="mx-auto flex min-h-[calc(100vh-88px)] max-w-4xl flex-col items-center justify-center px-6 py-12 text-center">
                <div className="w-full space-y-4">
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        403
                    </p>
                    <h1 className="text-4xl font-normal tracking-tight text-foreground sm:text-5xl">
                        Access forbidden
                    </h1>

                    <Image
                        src="/images/tom-612.webp"
                        alt="Access forbidden illustration"
                        width={612}
                        height={612}
                        priority
                        sizes="(min-width: 640px) 448px, calc(100vw - 48px)"
                        className="mx-auto block h-auto w-full max-w-sm object-contain sm:max-w-md"
                    />

                    <p className="mx-auto max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                        You do not have permission to access this page. This area is restricted to administrators only.
                    </p>
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Button asChild size="lg" className="min-w-44">
                        <Link href="/">Go to homepage</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
