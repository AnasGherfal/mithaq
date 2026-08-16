"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/locale";
import {
  getDirection,
  getOppositeLocale,
  switchLocaleInPath,
} from "@/i18n/locale";

type LocaleSwitcherProps = {
  locale: Locale;
  label: string;
  shortLabel: string;
};

export function LocaleSwitcher({
  locale,
  label,
  shortLabel,
}: LocaleSwitcherProps) {
  const pathname = usePathname();
  const targetLocale = getOppositeLocale(locale);
  const targetPath = switchLocaleInPath(pathname, targetLocale);

  return (
    <Button asChild variant="outline" size="sm">
      <a
        href={targetPath}
        hrefLang={targetLocale}
        lang={targetLocale}
        dir={getDirection(targetLocale)}
        aria-label={label}
      >
        {shortLabel}
      </a>
    </Button>
  );
}
