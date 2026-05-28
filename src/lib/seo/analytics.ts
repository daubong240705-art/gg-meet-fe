export const getGoogleAnalyticsId = () => {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim();

  return gaId || null;
};
