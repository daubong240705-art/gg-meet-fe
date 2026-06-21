import type { Metadata } from "next";

import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Read the Kallio privacy policy and learn how account, meeting, device, and technical information may be handled.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <MarketingPage
      eyebrow="Privacy policy · June 21, 2026"
      title="How Kallio handles information"
      description="This overview explains the information involved when you use Kallio and the choices available through your browser and account."
      primaryAction={{ label: "Return home", href: "/" }}
      secondaryAction={{ label: "Security overview", href: "/security" }}
      sections={[
        {
          title: "Information involved in the service",
          items: [
            { title: "Account information", description: "When you create an account, Kallio may process details such as your name, email address, profile image, and authentication information." },
            { title: "Meeting information", description: "Meeting titles, schedules, invitations, participant identity, room activity, and chat messages may be processed to provide meeting features." },
            { title: "Device permissions", description: "Camera, microphone, and screen access are controlled by your browser. Media access begins only after permission is granted." },
            { title: "Technical information", description: "The service may process network, browser, device, diagnostic, and security information needed to operate and protect the platform." },
          ],
        },
        {
          title: "How information is used",
          description: "Information is used to provide accounts and meetings, deliver invitations, maintain reliability, prevent abuse, troubleshoot problems, and improve the service. Access should be limited to what is needed for these purposes.",
        },
        {
          title: "Your choices and responsibilities",
          items: [
            { title: "Browser controls", description: "You can revoke camera, microphone, notification, and screen-sharing permissions through browser settings." },
            { title: "Meeting sharing", description: "Avoid posting private meeting links publicly and share personal information in a room only when appropriate." },
            { title: "Account questions", description: "Contact the Kallio team using the details in the site footer for questions about your account or information." },
          ],
        },
      ]}
    />
  );
}
