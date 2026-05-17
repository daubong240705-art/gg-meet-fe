import "./globals.css";

import { AppProvider } from "@/components/layout/app-provider";
import { SiteShell } from "@/components/layout/site-shell";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kallio",
  description: "Professional video meetings made simple",
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
