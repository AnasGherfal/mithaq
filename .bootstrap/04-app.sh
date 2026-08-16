#!/usr/bin/env bash
set -euo pipefail

mkdir -p 'src/app/(localized)/[locale]' 'src/app/(offline)/~offline' 'src/app/api/health' 'src/app/serwist/[path]'
cat > src/app/globals.css <<'EOF'
@import "tailwindcss";
@import "tw-animate-css";

:root {
  --background: #f8f4ea;
  --foreground: #17211d;
  --card: #fffdf8;
  --card-foreground: #17211d;
  --popover: #fffdf8;
  --popover-foreground: #17211d;
  --primary: #0f4d3f;
  --primary-foreground: #ffffff;
  --secondary: #e9efe9;
  --secondary-foreground: #0b3b31;
  --muted: #ece9df;
  --muted-foreground: #66736d;
  --accent: #f2eadb;
  --accent-foreground: #17211d;
  --destructive: #a63d40;
  --border: #d8d8cd;
  --input: #c8cec7;
  --ring: #0f4d3f;
  --gold: #a98342;
  --radius: 0.75rem;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-gold: var(--gold);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: var(--font-inter);
  --font-arabic: var(--font-noto-arabic);
}

* {
  border-color: var(--border);
}

html {
  min-width: 320px;
  background: var(--background);
  color: var(--foreground);
  text-rendering: optimizeLegibility;
}

body {
  min-height: 100svh;
  background:
    radial-gradient(
      circle at 15% 0%,
      color-mix(in srgb, var(--gold) 10%, transparent) 0,
      transparent 26rem
    ),
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--background) 94%, white) 0%,
      var(--background) 100%
    );
  color: var(--foreground);
  font-family: var(--font-inter), system-ui, sans-serif;
}

html[dir="rtl"] body {
  font-family: var(--font-noto-arabic), system-ui, sans-serif;
  line-height: 1.8;
}

::selection {
  background: color-mix(in srgb, var(--primary) 24%, transparent);
}

a,
button,
input {
  -webkit-tap-highlight-color: transparent;
}

:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 3px;
}

.threshold-pattern {
  background-image:
    linear-gradient(
      90deg,
      transparent 49.5%,
      color-mix(in srgb, var(--primary) 16%, transparent) 50%,
      transparent 50.5%
    ),
    linear-gradient(
      0deg,
      transparent 49.5%,
      color-mix(in srgb, var(--primary) 10%, transparent) 50%,
      transparent 50.5%
    );
  background-size: 32px 32px;
}

.safe-area-bottom {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}
EOF
cat > src/app/manifest.ts <<'EOF'
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ميثاق | Mithaq",
    short_name: "ميثاق",
    description:
      "ميثاق — أساس تقني عربي أولاً لشبكة تعارف جاد للزواج. Mithaq — an Arabic-first technical foundation for serious marriage introductions.",
    start_url: "/ar",
    scope: "/",
    display: "standalone",
    background_color: "#F8F4EA",
    theme_color: "#0F4D3F",
    lang: "ar",
    dir: "rtl",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ]
  };
}
EOF
cat > src/app/sw.ts <<'EOF'
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    cleanupOutdatedCaches: true
  },
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  disableDevLogs: true,
  runtimeCaching: [],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document";
        }
      }
    ]
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

serwist.addEventListeners();
EOF
cat > 'src/app/serwist/[path]/route.ts' <<'EOF'
import { createSerwistRoute } from "@serwist/turbopack";

const revision =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.GITHUB_SHA ??
  "local-development";

export const runtime = "nodejs";

export const {
  dynamic,
  dynamicParams,
  revalidate,
  generateStaticParams,
  GET
} = createSerwistRoute({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "src/app/sw.ts",
  useNativeEsbuild: true
});
EOF
cat > src/app/api/health/route.ts <<'EOF'
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      status: "ok",
      application: "Mithaq"
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
EOF
cat > 'src/app/(localized)/[locale]/layout.tsx' <<'EOF'
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import { PwaUpdateBanner } from "@/components/pwa/pwa-update-banner";
import { Toaster } from "@/components/ui/sonner";
import { getDirection } from "@/i18n/locale";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import { inter, notoSansArabic } from "@/lib/fonts";
import "../../globals.css";

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params
}: Pick<LocaleLayoutProps, "params">): Promise<Metadata> {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Metadata" });

  return {
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    applicationName: "ميثاق | Mithaq",
    title: {
      default: t("title"),
      template: `%s · ${t("title")}`
    },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ar: "/ar",
        en: "/en"
      }
    },
    robots: {
      index: false,
      follow: false,
      nocache: true
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
      ],
      apple: [
        {
          url: "/icons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png"
        }
      ]
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "ميثاق"
    },
    formatDetection: {
      telephone: false
    },
    openGraph: {
      type: "website",
      siteName: "ميثاق | Mithaq",
      title: t("title"),
      description: t("description"),
      locale: locale === "ar" ? "ar_LY" : "en_US"
    }
  };
}

export const viewport: Viewport = {
  themeColor: "#0F4D3F",
  colorScheme: "light"
};

export default async function LocaleLayout({
  children,
  params
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} dir={getDirection(locale)}>
      <body
        className={`${inter.variable} ${notoSansArabic.variable} min-h-svh antialiased`}
      >
        <NextIntlClientProvider>
          <PwaProvider>
            {children}
            <PwaUpdateBanner />
            <Toaster />
          </PwaProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
EOF
cat > 'src/app/(localized)/[locale]/page.tsx' <<'EOF'
import {
  Check,
  Landmark,
  LockKeyhole,
  ScanLine,
  ShieldCheck
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { ConnectivityStatus } from "@/components/pwa/connectivity-status";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
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
      icon: LockKeyhole
    },
    {
      title: t("rtlTitle"),
      body: t("rtlBody"),
      icon: Landmark
    },
    {
      title: t("qualityTitle"),
      body: t("qualityBody"),
      icon: ShieldCheck
    }
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
              <span className="size-4 rounded-t-full border-2 border-primary border-b-0" />
            </span>
            <span className="flex items-baseline gap-2">
              <span lang="ar" dir="rtl" className="text-xl">
                {t("nameArabic")}
              </span>
              <span lang="en" dir="ltr" className="text-sm text-muted-foreground">
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

            <h1 className="max-w-3xl text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
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
EOF
cat > 'src/app/(localized)/[locale]/loading.tsx' <<'EOF'
export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl animate-pulse px-4 py-10 sm:px-6 lg:px-8"
      aria-label="Loading"
    >
      <div className="h-11 w-52 rounded-full bg-muted" />
      <div className="mt-6 h-16 max-w-xl rounded-2xl bg-muted" />
      <div className="mt-4 h-8 max-w-md rounded-xl bg-muted" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-48 rounded-2xl bg-muted" />
        ))}
      </div>
    </main>
  );
}
EOF
cat > 'src/app/(localized)/[locale]/error.tsx' <<'EOF'
"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("Errors");

  return (
    <main className="mx-auto grid min-h-svh w-full max-w-xl place-items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-destructive/25 bg-card p-6 text-center shadow-sm">
        <AlertTriangle
          aria-hidden="true"
          className="mx-auto size-10 text-destructive"
        />
        <h1 className="mt-4 text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-3 leading-7 text-muted-foreground">{t("body")}</p>
        <Button type="button" className="mt-6" onClick={reset}>
          {t("retry")}
        </Button>
      </section>
    </main>
  );
}
EOF
cat > 'src/app/(localized)/[locale]/not-found.tsx' <<'EOF'
import { ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-svh w-full max-w-xl place-items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-3 text-2xl font-semibold">
          الصفحة غير موجودة · Page not found
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          تحقق من الرابط أو ارجع إلى الصفحة الرئيسية.
          <span lang="en" dir="ltr" className="mt-1 block">
            Check the address or return to the foundation page.
          </span>
        </p>
        <a
          href="/ar"
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          العودة إلى ميثاق
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </a>
      </section>
    </main>
  );
}
EOF
cat > 'src/app/(offline)/layout.tsx' <<'EOF'
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { inter, notoSansArabic } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "غير متصل | ميثاق",
  robots: {
    index: false,
    follow: false
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: "#0F4D3F",
  colorScheme: "light"
};

export default function OfflineLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body
        className={`${inter.variable} ${notoSansArabic.variable} min-h-svh antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
EOF
cat > 'src/app/(offline)/~offline/page.tsx' <<'EOF'
import { RefreshCw, WifiOff } from "lucide-react";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="mx-auto grid min-h-svh w-full max-w-2xl place-items-center px-4 py-12">
      <section className="w-full rounded-2xl border border-primary/15 bg-card p-7 shadow-sm sm:p-10">
        <div className="grid size-12 place-items-center rounded-xl bg-primary/8 text-primary">
          <WifiOff aria-hidden="true" />
        </div>

        <h1 className="mt-6 text-3xl font-bold">أنت غير متصل الآن</h1>
        <p className="mt-3 leading-8 text-muted-foreground">
          يمكن عرض الهيكل الأساسي المحفوظ لموقع ميثاق. أعد الاتصال لفتح الصفحات
          التي تحتاج إلى الشبكة.
        </p>

        <div lang="en" dir="ltr" className="mt-7 border-t border-border pt-7">
          <h2 className="text-2xl font-semibold">You are offline</h2>
          <p className="mt-3 leading-7 text-muted-foreground">
            The saved Mithaq application shell is available. Reconnect before
            using any network-dependent page.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/ar"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
          >
            الصفحة العربية
          </a>
          <a
            href="/ar"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2 text-sm font-semibold"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            إعادة المحاولة
          </a>
        </div>
      </section>
    </main>
  );
}
EOF
