import "./globals.css";

import { AppProvider } from "@/components/layout/app-provider";
import { SiteShell } from "@/components/layout/site-shell";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
const siteName = "Kallio";
const siteDescription =
  "Professional video meetings made simple. Connect, collaborate, and meet anywhere with HD video, screen sharing, and secure meeting rooms.";
const ogImage = "/og-image.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  authors: [{ name: "Kallio Team" }],
  creator: siteName,
  keywords: [
    "Kallio",
    "video meetings",
    "video calls",
    "online meetings",
    "team collaboration",
    "remote meetings",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName,
    title: `${siteName} | Professional Video Meetings`,
    description: siteDescription,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: `${siteName} video meeting platform`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Professional Video Meetings`,
    description: siteDescription,
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground">
        <AppProvider>
          <SiteShell>{children}</SiteShell>
        </AppProvider>
      </body>
    </html>
  );
}
