export const locales = ["ar", "en"] as const;

export type Locale = (typeof locales)[number];
export type Direction = "rtl" | "ltr";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDirection(locale: Locale): Direction {
  return locale === "ar" ? "rtl" : "ltr";
}

export function getOppositeLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}

export function switchLocaleInPath(
  pathname: string,
  targetLocale: Locale,
): string {
  const segments = pathname.split("/");

  if (segments.length > 1 && isLocale(segments[1] ?? "")) {
    segments[1] = targetLocale;
  } else {
    segments.splice(1, 0, targetLocale);
  }

  const switched = segments.join("/");
  return switched || `/${targetLocale}`;
}
