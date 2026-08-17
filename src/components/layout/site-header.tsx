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
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/82 shadow-[0_1px_0_rgba(15,77,63,0.03)] backdrop-blur-2xl supports-[backdrop-filter]:bg-background/74">
      <div className="mx-auto flex min-h-[4.75rem] w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group inline-flex min-h-11 shrink-0 items-center gap-3 rounded-xl font-semibold text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
          aria-label={t("homeLabel")}
        >
          <span
            className="grid size-10 place-items-center rounded-t-[1.45rem] rounded-b-[0.7rem] border border-primary/20 bg-card shadow-[0_8px_24px_rgba(15,77,63,0.08)] transition duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/30 group-hover:shadow-[0_12px_30px_rgba(15,77,63,0.12)]"
            aria-hidden="true"
          >
            <span className="size-4 rounded-t-full border-2 border-b-0 border-primary" />
          </span>
          <span className="leading-none">
            <span lang="ar" dir="rtl" className="block text-xl font-bold">
              ميثاق
            </span>
            <span
              lang="en"
              dir="ltr"
              className="mt-1 block text-[0.66rem] font-bold tracking-[0.2em] text-muted-foreground uppercase"
            >
              Mithaq
            </span>
          </span>
        </Link>

        <nav
          className="ms-auto hidden items-center gap-0.5 lg:flex"
          aria-label={t("primaryLabel")}
        >
          {navigation.map(([key, href]) => (
            <Button key={href} variant="ghost" size="sm" asChild>
              <Link href={href}>{t(key)}</Link>
            </Button>
          ))}
        </nav>

        <div className="ms-auto hidden items-center gap-2 sm:flex lg:ms-4">
          <LocaleSwitcher
            locale={locale}
            label={localeSwitcher("label")}
            shortLabel={localeSwitcher("short")}
          />
          <Button asChild>
            <Link href="/waitlist">
              <ShieldCheck aria-hidden="true" />
              {t("join")}
            </Link>
          </Button>
        </div>

        <details className="group ms-auto sm:hidden">
          <summary
            className="grid size-11 cursor-pointer list-none place-items-center rounded-xl border border-border/80 bg-card/90 text-foreground shadow-sm transition hover:border-primary/20 hover:bg-card [&::-webkit-details-marker]:hidden"
            aria-label={t("menuLabel")}
          >
            <Menu aria-hidden="true" className="size-5" />
          </summary>
          <div className="premium-panel absolute inset-x-4 top-[5.2rem] rounded-[1.5rem] p-3 shadow-[0_24px_60px_rgba(16,38,31,0.16)]">
            <nav className="grid gap-1" aria-label={t("mobileLabel")}>
              {navigation.map(([key, href]) => (
                <Button
                  key={href}
                  variant="ghost"
                  className="justify-start"
                  asChild
                >
                  <Link href={href}>{t(key)}</Link>
                </Button>
              ))}
              <Button variant="ghost" className="justify-start" asChild>
                <Link href="/for-men">{t("forMen")}</Link>
              </Button>
              <div className="my-2 h-px bg-border/70" />
              <div className="flex items-center justify-between gap-2 px-2 py-1">
                <LocaleSwitcher
                  locale={locale}
                  label={localeSwitcher("label")}
                  shortLabel={localeSwitcher("short")}
                />
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <ShieldCheck
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                  <span>
                    {locale === "ar" ? "خاص وآمن" : "Private by design"}
                  </span>
                </div>
              </div>
              <Button className="mt-2" asChild>
                <Link href="/waitlist">{t("join")}</Link>
              </Button>
            </nav>
          </div>
        </details>
      </div>
    </header>
  );
}
