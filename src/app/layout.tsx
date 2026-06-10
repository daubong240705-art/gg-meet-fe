import "./globals.css";

import { AppProvider } from "@/components/layout/app-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { getGoogleAnalyticsId } from "@/lib/seo/analytics";
import {
  getOpenGraphImage,
  getSiteUrl,
  SITE_NAME,
} from "@/lib/seo/site";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { Metadata } from "next";

const siteUrl = getSiteUrl();
const siteName = SITE_NAME;
const siteDescription =
  "Professional video meetings made simple. Connect, collaborate, and meet anywhere with HD video, screen sharing, and secure meeting rooms.";
const ogImage = getOpenGraphImage();

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
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Professional Video Meetings`,
    description: siteDescription,
    images: [ogImage.url],
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
  const gaId = getGoogleAnalyticsId();

  return (
    <html
      lang="en"
      className="dark"
      style={{ colorScheme: "dark" }}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground">
        {/*
          Runs before first paint: if a logged-in session exists in localStorage,
          flag the document so the home page can show a loading overlay instead of
          flashing the guest UI while React hydrates client-only auth state.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(window.desktop?.isElectron){document.documentElement.setAttribute('data-desktop','')}if(localStorage.getItem('auth-user')){document.documentElement.setAttribute('data-auth-pending','')}}catch(e){}",
          }}
        />
        <AppProvider>
          <SiteShell>{children}</SiteShell>
        </AppProvider>
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      </body>
    </html>
  );
}
