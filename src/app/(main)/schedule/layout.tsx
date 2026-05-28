import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Schedule Meeting",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ScheduleLayout({ children }: { children: ReactNode }) {
  return children;
}
