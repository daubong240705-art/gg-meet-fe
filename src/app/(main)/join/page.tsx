import type { Metadata } from "next";
import { Suspense } from "react";

import JoinPageClient from "@/components/meeting/join-page-client";

export const metadata: Metadata = {
  title: {
    absolute: "Join Meeting on Kallio",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function JoinPage() {
  // useSearchParams in the client component requires a Suspense boundary for
  // the static export build.
  return (
    <Suspense>
      <JoinPageClient />
    </Suspense>
  );
}
