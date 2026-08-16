import {
  Check,
  Landmark,
  LockKeyhole,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ConnectivityStatus } from "@/components/pwa/connectivity-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Locale } from "@/i18n/locale";

export default async function FoundationPage() {
  const t = await getTranslations("Foundation");
  const localeSwitcher = await getTranslations("LocaleSwitcher");
  const locale = (await getLocale()) as Locale;

  const principles = [
    {
      title: t("privacyTitle"),
      body: t("privacyBody"),
      icon: LockKeyhole,
    },
    {
      title: t("rtlTitle"),
      body: t("rtlBody"),
      icon: Landmark,
    },
    {
      title: t("qualityTitle"),
      body: t("qualityBody"),
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-svh">
      <header className="border-b border-border/80 bg-background/85 backdrop-blur">
        <div className="mx-auto flex min-h-20 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a
            href={`/${locale}`}
            className="inline-flex min-h-11 items-center gap-3 rounded-xl font-semibold text-primary"
            aria-label="Mithaq"
          >
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-t-[1.4rem] rounded-b-lg border border-primary/25 bg-primary/5"
            >
              <span className="size-4 rounded-t-full border-2 border-b-0 border-primary" />
            </span>
            <span className="flex items-baseline gap-2">
              <span lang="ar" dir="rtl" className="text-xl">
                {t("nameArabic")}
              </span>
              <span
                lang="en"
                dir="ltr"
                className="text-sm text-muted-foreground"
              >
                {t("nameEnglish")}
              </span>
            </span>
          </a>

          <LocaleSwitcher
            locale={locale}
            label={localeSwitcher("label")}
            shortLabel={localeSwitcher("short")}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <section className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
          <div>
            <p className="mb-5 inline-flex min-h-11 items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
              {t("eyebrow")}
            </p>

            <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-balance text-foreground sm:text-6xl">
              <span lang="ar" dir="rtl" className="block">
                {t("nameArabic")}
              </span>
              <span
                lang="en"
                dir="ltr"
                className="mt-1 block text-2xl font-semibold tracking-normal text-muted-foreground sm:text-3xl"
              >
                {t("nameEnglish")}
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-xl font-semibold text-primary sm:text-2xl">
              {t("tagline")}
            </p>

            <div className="mt-8 max-w-2xl">
              <h2 className="text-2xl font-semibold text-foreground">
                {t("statusTitle")}
              </h2>
              <p className="mt-3 text-base leading-8 text-muted-foreground sm:text-lg">
                {t("statusBody")}
              </p>
            </div>

            <div className="mt-7">
              <ConnectivityStatus />
            </div>
          </div>

          <Card className="threshold-pattern overflow-hidden border-primary/15 bg-card/95">
            <CardContent className="relative grid min-h-96 place-items-center px-6 py-10">
              <div
                aria-hidden="true"
                className="absolute inset-x-8 top-8 h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent"
              />
              <div className="relative flex w-full max-w-sm flex-col items-center">
                <div className="relative h-64 w-48 rounded-t-[6rem] border border-primary/30 bg-background/90 p-4 shadow-[inset_0_0_0_8px_rgba(15,77,63,0.035)]">
                  <div className="h-full w-full rounded-t-[5rem] border-2 border-primary/65 bg-card">
                    <div className="mx-auto mt-8 h-36 w-px bg-gold/55" />
                    <div className="mx-auto size-3 -translate-y-20 rounded-full border border-primary/30 bg-gold/65" />
                  </div>
                </div>
                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                  <Check aria-hidden="true" />
                  {t("exampleBadge")}
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section
          aria-label={t("statusTitle")}
          className="mt-14 grid gap-4 md:grid-cols-3 lg:mt-20"
        >
          {principles.map(({ title, body, icon: Icon }) => (
            <Card key={title} className="h-full">
              <CardHeader>
                <div className="mb-2 grid size-11 place-items-center rounded-xl bg-primary/8 text-primary">
                  <Icon aria-hidden="true" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{body}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <Card className="mt-6 border-gold/25">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle>{t("exampleTitle")}</CardTitle>
                <CardDescription className="mt-2 max-w-3xl">
                  {t("exampleBody")}
                </CardDescription>
              </div>
              <ScanLine aria-hidden="true" className="text-gold" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-semibold text-foreground">
                {t("tagline")}
              </p>
              <p
                dir="ltr"
                className="mt-3 rounded-lg border border-input bg-card px-4 py-3 font-mono text-sm text-muted-foreground"
              >
                {t("examplePhone")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Separator className="my-10" />

        <footer className="safe-area-bottom text-center text-sm leading-7 text-muted-foreground">
          {t("footer")}
        </footer>
      </main>
    </div>
  );
}
