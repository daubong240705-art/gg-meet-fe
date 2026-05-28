import type { Metadata } from "next";

import HomePageClient from "@/components/home/home-page-client";
import JsonLd from "@/components/seo/JsonLd";
import {
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
  buildWebSiteSchema,
} from "@/lib/seo/jsonld";

export const metadata: Metadata = {
  title: {
    absolute: "Kallio",
  },
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd schema={buildWebSiteSchema()} />
      <JsonLd schema={buildOrganizationSchema()} />
      <JsonLd schema={buildSoftwareApplicationSchema()} />
      <HomePageClient />
    </>
  );
}
