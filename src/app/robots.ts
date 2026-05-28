import type { MetadataRoute } from "next";

const DEFAULT_SITE_URL = "http://localhost:3000";

const getSiteUrl = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;

  return siteUrl.replace(/\/+$/, "") || DEFAULT_SITE_URL;
};

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/sign-in",
        "/sign-up",
        "/profile",
        "/schedule",
        "/admin",
        "/api/",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
