export const DEFAULT_SITE_URL = "http://localhost:3000";
export const SITE_NAME = "Kallio";
export const OG_IMAGE_FILE_PATH = "/og-image.png";
export const OG_IMAGE_PATH = `${OG_IMAGE_FILE_PATH}?v=20260528`;
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT = `${SITE_NAME} video meeting platform`;

type OpenGraphImage = {
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  type: string;
  alt: string;
};

export const getSiteUrl = () => {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;

  return siteUrl.replace(/\/+$/, "") || DEFAULT_SITE_URL;
};

export const getAbsoluteUrl = (path: string) =>
  new URL(path, `${getSiteUrl()}/`).toString();

export const getOpenGraphImage = (): OpenGraphImage => {
  const imageUrl = getAbsoluteUrl(OG_IMAGE_PATH);

  return {
    url: imageUrl,
    secureUrl: imageUrl,
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    type: "image/png",
    alt: OG_IMAGE_ALT,
  };
};
