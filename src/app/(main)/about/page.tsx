import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "About Kallio",
  description: "Learn why Kallio was built and how it makes browser-based video meetings simpler for teams and communities.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <MarketingPage
      eyebrow="About Kallio"
      title="Meetings should help people move forward"
      description="Kallio is a browser-based video meeting platform designed around a simple idea: joining, talking, and collaborating should feel natural."
      sections={[
        {
          title: "Why we built Kallio",
          description: "Remote teams, classes, and communities need reliable communication without a maze of setup screens. Kallio brings the essential meeting tools into a focused experience that works from a familiar web browser.",
        },
        {
          title: "What guides the product",
          items: [
            { title: "Simple by default", description: "Common actions should be easy to find for first-time participants and regular hosts alike." },
            { title: "Respectful collaboration", description: "Waiting rooms, hand raising, and participant controls help meetings stay organized." },
            { title: "Useful over flashy", description: "We prioritize practical improvements to call quality, reliability, and meeting flow." },
          ],
        },
      ]}
    />
  );
}
