import type { MetadataRoute } from "next";

// Already prerendered statically on the web; the explicit flag is required
// for the desktop build (output: "export").
export const dynamic = "force-static";

const DEFAULT_SITE_URL = "http://localhost:3000";

const getSiteUrl = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;

  return siteUrl.replace(/\/+$/, "") || DEFAULT_SITE_URL;
};

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const routes = [
    "",
    "/features",
    "/how-it-works",
    "/security",
    "/help",
    "/faq",
    "/about",
    "/privacy-policy",
  ];

  return routes.map((route) => ({
    url: route ? `${siteUrl}${route}` : `${siteUrl}/`,
    changeFrequency: route ? "monthly" : "weekly",
    priority: route === "" ? 1 : route === "/features" ? 0.9 : 0.7,
  }));
}
