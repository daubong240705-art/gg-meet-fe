import "./globals.css";

import { AppProvider } from "@/components/layout/app-provider";
import { SiteShell } from "@/components/layout/site-shell";

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
