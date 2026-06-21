import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "How Kallio Works",
  description: "Learn how to create, join, and manage a Kallio video meeting from your browser.",
  alternates: { canonical: "/how-it-works" },
};

export default function HowItWorksPage() {
  return (
    <MarketingPage
      eyebrow="How it works"
      title="From invitation to conversation in a few steps"
      description="Kallio keeps the path into a meeting simple while giving hosts control over who joins."
      sections={[
        {
          title: "Host a meeting",
          items: [
            { title: "1. Sign in", description: "Open your Kallio account to create and manage meetings." },
            { title: "2. Start or schedule", description: "Create a room immediately or choose a future date and time." },
            { title: "3. Share the invitation", description: "Send the meeting link or room code to the people you want to invite." },
            { title: "4. Admit participants", description: "Review waiting guests and decide who can enter your meeting." },
            { title: "5. Collaborate", description: "Use video, audio, chat, screen sharing, and hand raising during the call." },
            { title: "6. End with control", description: "Leave the room or end the session for everyone when the meeting is complete." },
          ],
        },
        {
          title: "Join a meeting",
          description: "Open an invitation link or enter the meeting code on the Kallio home page. Check your camera and microphone in the lobby, enter your name if joining as a guest, and wait for host approval when required.",
        },
      ]}
    />
  );
}
