const DEFAULT_SITE_URL = "http://localhost:3000";

const getSiteUrl = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;

  return siteUrl.replace(/\/+$/, "") || DEFAULT_SITE_URL;
};

export function buildWebSiteSchema() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: "Kallio",
    url: `${siteUrl}/`,
    description: "Professional video meetings made simple.",
    publisher: {
      "@id": `${siteUrl}/#organization`,
    },
  };
}

export function buildOrganizationSchema() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: "Kallio",
    url: `${siteUrl}/`,
    logo: `${siteUrl}/favicon.ico`,
    description:
      "Professional video meetings for students, companies, and remote teams.",
  };
}

export function buildSoftwareApplicationSchema() {
  const siteUrl = getSiteUrl();

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteUrl}/#software-application`,
    name: "Kallio",
    applicationCategory: "CommunicationApplication",
    operatingSystem: "Web",
    url: `${siteUrl}/`,
    description:
      "Professional video meetings made simple with HD video, screen sharing, and secure meeting rooms.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    publisher: {
      "@id": `${siteUrl}/#organization`,
    },
  };
}
