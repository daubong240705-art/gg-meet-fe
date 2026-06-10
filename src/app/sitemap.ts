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

  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
