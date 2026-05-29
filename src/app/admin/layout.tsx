import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Home, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AdminAuthGuard } from "@/components/admin/admin-auth-guard";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

export const metadata: Metadata = {
  title: "Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="flex h-16 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold leading-tight">Admin Panel</p>
              <p className="text-xs text-muted-foreground">Kallio Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <Home className="h-4 w-4" />
                Home
              </Link>
            </Button>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <AdminAuthGuard>{children}</AdminAuthGuard>
      </main>
    </div>
  );
}
