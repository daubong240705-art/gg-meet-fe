import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "Meeting Security",
  description: "Understand Kallio meeting access controls, waiting rooms, authentication, and practical privacy guidance.",
  alternates: { canonical: "/security" },
};

export default function SecurityPage() {
  return (
    <MarketingPage
      eyebrow="Security"
      title="Practical controls for safer meetings"
      description="Kallio combines authenticated host access, controlled room entry, and browser permission safeguards."
      sections={[
        {
          title: "Controls built into the meeting flow",
          items: [
            { title: "Authenticated hosts", description: "Account authentication protects meeting creation and account-specific management features." },
            { title: "Waiting room approval", description: "Guests can be held outside the room until a host admits them." },
            { title: "Host moderation", description: "Hosts can manage participants and remove someone from a meeting when necessary." },
            { title: "Browser permissions", description: "Your browser asks before Kallio can access a camera, microphone, or shared screen." },
            { title: "Time-bound meeting access", description: "Scheduled meetings follow their configured lifecycle rather than remaining permanently open." },
            { title: "Private account pages", description: "Profiles, schedules, and administration pages are excluded from search indexing." },
          ],
        },
        {
          title: "What participants can do",
          description: "Only share meeting links with intended participants, review the browser's sharing preview, keep your account credentials private, and leave a meeting if you do not recognize the host or room.",
        },
      ]}
    />
  );
}
