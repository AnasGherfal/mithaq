import { Menu, ShieldCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/locale";

const navigation = [
  ["howItWorks", "/how-it-works"],
  ["forWomen", "/for-women"],
  ["safety", "/privacy-safety"],
  ["diaspora", "/libya-diaspora"],
  ["faq", "/faq"],
] as const;

export async function SiteHeader() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("Navigation");
  const localeSwitcher = await getTranslations("LocaleSwitcher");

  return (
    <header className="sticky top-0 z-40 border-b border-border/75 bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex min-h-18 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-xl font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label={t("homeLabel")}
        >
          <span className="grid size-10 place-items-center rounded-t-[1.4rem] rounded-b-lg border border-primary/25 bg-primary/5" aria-hidden="true">
            <span className="size-4 rounded-t-full border-2 border-b-0 border-primary" />
          </span>
          <span className="leading-none">
            <span lang="ar" dir="rtl" className="block text-xl font-bold">ميثاق</span>
            <span lang="en" dir="ltr" className="mt-1 block text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Mithaq</span>
          </span>
        </Link>

        <nav className="ms-auto hidden items-center gap-1 lg:flex" aria-label={t("primaryLabel")}>
          {navigation.map(([key, href]) => (
            <Button key={href} variant="ghost" size="sm" asChild>
              <Link href={href}>{t(key)}</Link>
            </Button>
          ))}
        </nav>

        <div className="ms-auto hidden items-center gap-2 sm:flex lg:ms-3">
          <LocaleSwitcher locale={locale} label={localeSwitcher("label")} shortLabel={localeSwitcher("short")} />
          <Button asChild>
            <Link href="/waitlist" aria-describedby="waitlist-coming-soon">
              {t("join")}
            </Link>
          </Button>
          <span id="waitlist-coming-soon" className="sr-only">{t("joinNote")}</span>
        </div>

        <details className="group ms-auto sm:hidden">
          <summary className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border border-border bg-card text-foreground [&::-webkit-details-marker]:hidden" aria-label={t("menuLabel")}>
            <Menu aria-hidden="true" className="size-5" />
          </summary>
          <div className="absolute inset-x-4 top-[4.75rem] rounded-2xl border border-border bg-card p-3 shadow-lg">
            <nav className="grid gap-1" aria-label={t("mobileLabel")}>
              {navigation.map(([key, href]) => (
                <Button key={href} variant="ghost" className="justify-start" asChild>
                  <Link href={href}>{t(key)}</Link>
                </Button>
              ))}
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/for-men">{t("forMen")}</Link>
              </Button>
              <div className="my-2 h-px bg-border" />
              <div className="flex items-center justify-between gap-2 px-2 py-1">
                <LocaleSwitcher locale={locale} label={localeSwitcher("label")} shortLabel={localeSwitcher("short")} />
                <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
              </div>
              <Button className="mt-1" asChild>
                <Link href="/waitlist">{t("join")}</Link>
              </Button>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
