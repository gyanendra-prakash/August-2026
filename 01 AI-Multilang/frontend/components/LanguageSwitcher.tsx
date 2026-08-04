"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { locales, localeNames } from "@/lib/i18n-config";

// Ye dropdown user ko dikhta hai. Jab wo language select karta hai,
// URL badal jaata hai (jaise /en/... -> /hi/...) aur nayi JSON load ho jaati hai

export default function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useLocale();

  function handleChange(newLocale: string) {
    const segments = pathname.split("/");
    segments[1] = newLocale; // pehla segment hamesha locale hota hai
    router.push(segments.join("/"));
  }

  return (
    <select
      className="lang-select"
      value={currentLocale}
      onChange={(e) => handleChange(e.target.value)}
    >
      {locales.map((loc) => (
        <option key={loc} value={loc}>
          {localeNames[loc]}
        </option>
      ))}
    </select>
  );
}
