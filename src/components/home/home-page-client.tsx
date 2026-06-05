"use client";

import { useEffect } from "react";

import AuthenticatedHome from "@/components/home/authenticated-home";
import GuestHome from "@/components/home/guest-home";
import HomeAuthLoadingOverlay from "@/components/home/home-auth-loading-overlay";
import { useAuthSession } from "@/lib/auth/auth-session";

export default function HomePageClient() {
  const { isAuthenticated, isLoading } = useAuthSession();

  // Once hydrated we know the real auth state — drop the pre-paint flag so the
  // loading overlay stops showing for logged-in visitors.
  useEffect(() => {
    document.documentElement.removeAttribute("data-auth-pending");
  }, []);

  // Before hydration we can't read localStorage, so render the SEO-friendly
  // guest landing for everyone. For a logged-in visitor the pre-paint script set
  // `data-auth-pending`, which reveals the overlay on top so they see a loader
  // instead of a flash of the guest homepage.
  if (isLoading) {
    return (
      <>
        <GuestHome />
        <HomeAuthLoadingOverlay />
      </>
    );
  }

  return isAuthenticated ? <AuthenticatedHome /> : <GuestHome />;
}
