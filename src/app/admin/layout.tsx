import Link from "next/link";
import type { ReactNode } from "react";
import { BarChart3, Home, Shield, UsersRound, Video } from "lucide-react";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";

const adminNavItems = [
  {
    label: "Overview",
    href: "/admin",
    icon: BarChart3,
  },
  {
    label: "Users",
    href: "/admin#users",
    icon: UsersRound,
  },
  {
    label: "Meetings",
    href: "/admin#meetings",
    icon: Video,
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-card/60 backdrop-blur lg:flex lg:flex-col">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold leading-tight">Admin Panel</p>
            <p className="text-xs text-muted-foreground">Kallio Management</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {adminNavItems.map((item) => {
            const Icon = item.icon;

            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className="w-full justify-start"
              >
                <Link href={item.href}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="border-t border-border p-3">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/">
              <Home className="h-4 w-4" />
              Back to home
            </Link>
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold leading-tight">Admin Panel</p>
                <p className="text-xs text-muted-foreground">Kallio Management</p>
              </div>
            </div>

            <div className="hidden lg:block">
              <p className="text-sm text-muted-foreground">Admin workspace</p>
            </div>

            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <Home className="h-4 w-4" />
                  Home
                </Link>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
