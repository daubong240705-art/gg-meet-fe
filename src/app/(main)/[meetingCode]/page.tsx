import type { Metadata } from "next";

import MeetingPageClient from "@/components/meeting/meeting-page-client";
import { getBackendBaseUrl } from "@/lib/config/api-url";
import {
  getAbsoluteUrl,
  getOpenGraphImage,
  SITE_NAME,
} from "@/lib/seo/site";
import type { VerifyMeetingResponseData } from "@/shared/services/meeting.service";

const METADATA_TIMEOUT_MS = 2_000;
const FALLBACK_TITLE = "Join Meeting on Kallio";
const FALLBACK_DESCRIPTION =
  "Join a secure Kallio video meeting from your browser.";

type MeetingPageParams = {
  meetingCode?: string | string[];
};

type MeetingPageProps = {
  params: Promise<MeetingPageParams>;
};

const getMeetingCode = (params: MeetingPageParams) => {
  const meetingCode = Array.isArray(params.meetingCode)
    ? params.meetingCode[0]
    : params.meetingCode;

  return meetingCode?.trim() || "";
};

const getMeetingPath = (meetingCode: string) =>
  meetingCode ? `/${encodeURIComponent(meetingCode)}` : "/";

const getMeetingDescription = (meetingTitle: string | null) =>
  meetingTitle
    ? `Join "${meetingTitle}" on Kallio.`
    : FALLBACK_DESCRIPTION;

async function getMeetingTitle(meetingCode: string) {
  if (!meetingCode) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), METADATA_TIMEOUT_MS);

  try {
    const verifyUrl = new URL(
      `${getBackendBaseUrl().replace(/\/+$/, "")}/meetings/verify`,
    );
    verifyUrl.searchParams.set("meetingCode", meetingCode);

    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
      },
      next: {
        revalidate: 0,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json() as IBackendRes<
      VerifyMeetingResponseData | null
    >;
    const title = payload.data?.title?.trim();

    return title || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateMetadata({ params }: MeetingPageProps): Promise<Metadata> {
  const meetingCode = getMeetingCode(await params);
  const meetingTitle = await getMeetingTitle(meetingCode);
  const title = meetingTitle || FALLBACK_TITLE;
  const description = getMeetingDescription(meetingTitle);
  const canonicalPath = getMeetingPath(meetingCode);
  const ogImage = getOpenGraphImage();

  return {
    title: {
      absolute: title,
    },
    description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: "website",
      url: getAbsoluteUrl(canonicalPath),
      siteName: SITE_NAME,
      title,
      description,
      images: [ogImage],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage.url],
    },
  };
}

export default async function MeetingPage({ params }: MeetingPageProps) {
  const meetingCode = getMeetingCode(await params);

  return <MeetingPageClient key={meetingCode} meetingCode={meetingCode} />;
}
