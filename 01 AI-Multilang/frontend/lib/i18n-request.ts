import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale } from "./i18n-config";



export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !locales.includes(locale as any)) {
    locale = defaultLocale;
  }

  return {
    locale,
    // Yahan par actual JSON import ho rahi hai locale ke basis par
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
