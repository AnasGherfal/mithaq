import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
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
  params,
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
      template: `%s · ${t("title")}`,
    },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: { ar: "/ar", en: "/en" },
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    appleWebApp: { capable: true, statusBarStyle: "default", title: "ميثاق" },
    formatDetection: { telephone: false },
    openGraph: {
      type: "website",
      siteName: "ميثاق | Mithaq",
      title: t("title"),
      description: t("description"),
      locale: locale === "ar" ? "ar_LY" : "en_US",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0F4D3F",
  colorScheme: "light",
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} dir={getDirection(locale)}>
      <body className={`${inter.variable} ${notoSansArabic.variable} min-h-svh antialiased`}>
        <NextIntlClientProvider>
          <PwaProvider>
            <div className="min-h-svh">
              <SiteHeader />
              {children}
              <SiteFooter />
            </div>
            <PwaUpdateBanner />
            <Toaster />
          </PwaProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
