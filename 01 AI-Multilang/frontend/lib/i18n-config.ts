

export const locales = ["en", "hi", "es", "fr", "de", "zh", "ru", "ja"] as const;
export const defaultLocale = "en";

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  zh: "中文",
  ru: "Русский",
  ja: "日本語",
};
