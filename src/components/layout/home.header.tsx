"use client";

import { Loader2, LogOut, UserRound, Video } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getUserInitials, useAuthSession } from "@/lib/auth/auth-session";
import { useLogoutMutation } from "@/hooks/auth/useLoginForm";

import { Button } from "../ui/button";

export default function Homeheader() {
    const { isAuthenticated, user } = useAuthSession();
    const logoutMutation = useLogoutMutation();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement | null>(null);
    const closeTimeoutRef = useRef<number | null>(null);

    const clearCloseTimeout = () => {
        if (closeTimeoutRef.current !== null) {
            window.clearTimeout(closeTimeoutRef.current);
            closeTimeoutRef.current = null;
        }
    };

    const openMenu = () => {
        clearCloseTimeout();
        setMenuOpen(true);
    };

    const scheduleCloseMenu = () => {
        clearCloseTimeout();
        closeTimeoutRef.current = window.setTimeout(() => {
            setMenuOpen(false);
            closeTimeoutRef.current = null;
        }, 180);
    };

    useEffect(() => {
        if (!menuOpen) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            if (!menuRef.current?.contains(event.target as Node)) {
                clearCloseTimeout();
                setMenuOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                clearCloseTimeout();
                setMenuOpen(false);
            }
        };

        window.addEventListener("mousedown", handleClickOutside);
        window.addEventListener("keydown", handleEscape);

        return () => {
            window.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener("keydown", handleEscape);
        };
    }, [menuOpen]);

    useEffect(() => {
        return () => {
            clearCloseTimeout();
        };
    }, []);

    const handleSignOut = () => {
        clearCloseTimeout();
        setMenuOpen(false);
        logoutMutation.mutate();
    };

    return (
        <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                        <Video className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-2xl font-semibold text-foreground">Kallio</span>
                </Link>

                {/* <nav className="hidden md:flex items-center gap-8">
                    <a href="#features" className="text-foreground/70 hover:text-foreground transition-colors">Features</a>
                    <a href="#pricing" className="text-foreground/70 hover:text-foreground transition-colors">Pricing</a>
                    <a href="#about" className="text-foreground/70 hover:text-foreground transition-colors">About</a>
                </nav> */}

                <div className="flex items-center gap-3">
                    {isAuthenticated && user ? (
                        <div
                            ref={menuRef}
                            className="relative after:absolute after:inset-x-0 after:top-full after:h-3 after:content-['']"
                            onMouseEnter={openMenu}
                            onMouseLeave={scheduleCloseMenu}
                        >
                            <button
                                type="button"
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                onClick={() => {
                                    clearCloseTimeout();
                                    setMenuOpen((currentValue) => !currentValue);
                                }}
                                className="flex items-center gap-3 rounded-full  bg-background/85 px-2 py-1.5 transition hover:bg-muted/70"
                            >
                                <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                                    {getUserInitials(user.fullName)}
                                </div>

                                {/* <div className="hidden text-left sm:block">
                                    <p className="max-w-32 truncate text-sm font-medium leading-none text-foreground">
                                        {user.fullName}
                                    </p>
                                </div> */}

                                {/* <ChevronDown
                                    className={`hidden size-4 text-muted-foreground transition-transform sm:block ${menuOpen ? "rotate-180" : ""}`}
                                /> */}
                            </button>

                            {menuOpen ? (
                                <div
                                    role="menu"
                                    className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-border/70 bg-background/95 p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl"
                                >
                                    <div className="mb-2 rounded-xl bg-muted/60 px-3 py-3">
                                        <p className="truncate text-sm font-semibold text-foreground">
                                            {user.fullName}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>

                                    <Link
                                        href="/dashboard"
                                        role="menuitem"
                                        onClick={() => setMenuOpen(false)}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-foreground transition hover:bg-muted"
                                    >
                                        <UserRound className="size-4 text-muted-foreground" />
                                        <div className="min-w-0 text-left">
                                            <p className="font-medium">Profile</p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                Open your profile
                                            </p>
                                        </div>
                                    </Link>

                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={handleSignOut}
                                        disabled={logoutMutation.isPending}
                                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-destructive transition hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {logoutMutation.isPending ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <LogOut className="size-4" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-medium">Sign out</p>
                                            <p className="truncate text-xs text-destructive/80">
                                                End your current session
                                            </p>
                                        </div>
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <Button asChild size="sm">
                            <Link href="/sign-in">Sign in</Link>
                        </Button>
                    )}
                </div>
            </div>
        </header>
    )

}
