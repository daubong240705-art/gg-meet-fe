"use client";

import AuthenticatedHome from "@/components/home/authenticated-home";
import GuestHome from "@/components/home/guest-home";
import { useAuthSession } from "@/lib/auth/auth-session";

export default function HomePage() {
  const { isAuthenticated } = useAuthSession();

  return isAuthenticated ? <AuthenticatedHome /> : <GuestHome />;
}
