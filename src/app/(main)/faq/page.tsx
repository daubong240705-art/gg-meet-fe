import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description: "Answers to common questions about Kallio accounts, meeting access, devices, screen sharing, and privacy.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <MarketingPage
      eyebrow="FAQ"
      title="Common questions, straightforward answers"
      description="Find quick guidance before your next Kallio meeting."
      sections={[
        {
          title: "Joining and hosting",
          items: [
            { title: "Do I need an account to join?", description: "Guests can join supported meetings with a valid invitation or room code. An account is required to create and manage meetings." },
            { title: "Why am I waiting to enter?", description: "The meeting uses a waiting room. A host must review and admit your request." },
            { title: "Can I schedule a meeting?", description: "Yes. Signed-in users can choose a future date and time and prepare invitations in advance." },
          ],
        },
        {
          title: "Devices and collaboration",
          items: [
            { title: "Why can Kallio not see my camera?", description: "Check the site's browser permissions and confirm that another application is not already using the camera." },
            { title: "Can I join without video?", description: "Yes. Turn off the camera in the lobby and continue with audio when the meeting allows it." },
            { title: "What can I share?", description: "Your browser may let you share an entire screen, a window, or an individual browser tab." },
            { title: "How does hand raising work?", description: "Raise your hand from the meeting controls. The participant list prioritizes raised hands by time." },
            { title: "Does Kallio reduce background noise?", description: "Kallio requests standard browser audio processing such as echo cancellation and noise suppression when supported." },
            { title: "Where can I learn more?", description: "Visit the Help Center for guidance on the main meeting workflows.", href: "/help" },
          ],
        },
      ]}
    />
  );
}
