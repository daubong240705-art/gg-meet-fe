import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "Help Center",
  description: "Get help creating, joining, and using Kallio video meetings.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  return (
    <MarketingPage
      eyebrow="Help Center"
      title="Make every Kallio meeting easier"
      description="Quick answers for joining a room, preparing your devices, presenting, and managing participants."
      primaryAction={{ label: "Join a meeting", href: "/" }}
      secondaryAction={{ label: "Read common questions", href: "/faq" }}
      sections={[
        {
          title: "Getting started",
          items: [
            { title: "Create a meeting", description: "Sign in, create a room now or schedule one, then share its invitation link." },
            { title: "Join with a code", description: "Enter the room code on the home page and follow the lobby prompts." },
            { title: "Prepare your devices", description: "Allow browser permissions and check the selected camera and microphone before entering." },
          ],
        },
        {
          title: "During a meeting",
          items: [
            { title: "Share your screen", description: "Choose the screen, window, or tab you want others to see, then confirm the browser prompt." },
            { title: "Use chat", description: "Open the chat panel to send messages and links to the room." },
            { title: "Raise your hand", description: "Use the hand control when you want to speak without interrupting." },
            { title: "Manage the waiting room", description: "As host, review pending guests and admit or decline each request." },
            { title: "Fix camera or microphone", description: "Check browser permissions, select another device, and make sure another application is not using it." },
            { title: "Improve audio", description: "Use headphones when possible and reduce nearby fan or speaker noise." },
          ],
        },
      ]}
    />
  );
}
