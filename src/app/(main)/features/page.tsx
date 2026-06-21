import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "Video Meeting Features",
  description: "Explore Kallio features for clear calls, screen sharing, chat, scheduling, waiting rooms, and meeting collaboration.",
  alternates: { canonical: "/features" },
};

export default function FeaturesPage() {
  return (
    <MarketingPage
      eyebrow="Kallio features"
      title="Everything your team needs to meet well"
      description="Run focused video meetings from the browser with practical controls for hosts and participants."
      sections={[
        {
          title: "Clear communication",
          description: "Kallio combines real-time video, audio, and messaging in one meeting room.",
          items: [
            { title: "Video and audio", description: "Choose your camera and microphone before joining, then control them throughout the call." },
            { title: "Noise reduction", description: "Browser-based echo cancellation, noise suppression, and automatic gain control help voices sound clearer." },
            { title: "Meeting chat", description: "Share messages and links without interrupting the current speaker." },
          ],
        },
        {
          title: "Better meeting flow",
          items: [
            { title: "Screen sharing", description: "Present a screen, window, or browser tab and keep the room focused on shared content." },
            { title: "Raise hand", description: "Signal that you want to speak. Raised hands are ordered so the host can respond fairly." },
            { title: "Waiting room", description: "Hosts can review guests and admit or decline join requests before they enter." },
            { title: "Participant controls", description: "See who is present and use host controls to manage the room when needed." },
            { title: "Scheduling", description: "Create a meeting for later, set its time, and invite participants in advance." },
            { title: "Fast browser access", description: "Open a meeting link or enter a room code without installing a browser extension." },
          ],
        },
      ]}
    />
  );
}
