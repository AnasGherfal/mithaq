#!/usr/bin/env bash
set -euo pipefail

mkdir -p src/messages src/i18n src/lib/supabase src/types
cat > src/messages/ar.json <<'EOF'
{
  "Metadata": {
    "title": "ميثاق | تعارف موثّق للزواج الجاد",
    "description": "الأساس التقني لمنصة ميثاق، شبكة خاصة للتعارف الجاد بغرض الزواج لليبيين."
  },
  "Foundation": {
    "eyebrow": "المرحلة الأولى · الأساس التقني",
    "nameArabic": "ميثاق",
    "nameEnglish": "Mithaq",
    "tagline": "تعارف موثّق للزواج الجاد",
    "statusTitle": "نعمل على إعداد أساس آمن وموثوق",
    "statusBody": "هذه الصفحة مخصّصة للتحقق من البنية التقنية ودعم العربية واتجاه الكتابة. التسجيل في قائمة الانتظار غير متاح في هذه المرحلة.",
    "privacyTitle": "الخصوصية منذ البداية",
    "privacyBody": "لا تجمع هذه النسخة بيانات تسجيل أو صوراً أو وثائق هوية.",
    "rtlTitle": "العربية أولاً",
    "rtlBody": "واجهة عربية صحيحة الاتجاه مع دعم إنجليزي من البنية نفسها.",
    "qualityTitle": "بناء مدروس",
    "qualityBody": "تُجهّز الاختبارات وإمكانية الوصول والعمل دون اتصال قبل إضافة رحلة التسجيل.",
    "exampleTitle": "بطاقة اختبار اتجاه الواجهة",
    "exampleBody": "يبدأ المحتوى من اليمين في العربية ومن اليسار في الإنجليزية، مع بقاء الأرقام التقنية واضحة.",
    "exampleBadge": "اتجاه صحيح",
    "examplePhone": "+218 9X XXX XXXX",
    "footer": "الأساس التقني فقط — لا توجد ميزات مطابقة أو مراسلة في هذا الإصدار."
  },
  "LocaleSwitcher": {
    "label": "عرض النسخة الإنجليزية",
    "short": "English"
  },
  "Connectivity": {
    "online": "متصل بالإنترنت",
    "offline": "أنت غير متصل بالإنترنت",
    "offlineDetail": "يمكنك عرض الواجهة المحفوظة، لكن أي إرسال للبيانات سيحتاج إلى اتصال."
  },
  "PwaUpdate": {
    "title": "يتوفر تحديث جديد",
    "body": "حدّث الواجهة للحصول على أحدث نسخة من ميثاق.",
    "action": "تحديث الآن",
    "dismiss": "لاحقاً"
  },
  "Errors": {
    "title": "حدث خطأ غير متوقع",
    "body": "لم نفقد أي بيانات في هذه الصفحة التأسيسية. أعد المحاولة.",
    "retry": "إعادة المحاولة"
  },
  "Offline": {
    "arabicTitle": "أنت غير متصل الآن",
    "arabicBody": "يمكن عرض الهيكل الأساسي المحفوظ لموقع ميثاق. أعد الاتصال لفتح الصفحات التي تحتاج إلى الشبكة.",
    "englishTitle": "You are offline",
    "englishBody": "The saved Mithaq application shell is available. Reconnect before using any network-dependent page.",
    "retry": "إعادة المحاولة",
    "home": "الصفحة العربية"
  }
}
EOF
cat > src/messages/en.json <<'EOF'
{
  "Metadata": {
    "title": "Mithaq | Serious, trusted marriage introductions",
    "description": "The technical foundation for Mithaq, a private marriage-introduction network for Libyans."
  },
  "Foundation": {
    "eyebrow": "Milestone 1 · Technical foundation",
    "nameArabic": "ميثاق",
    "nameEnglish": "Mithaq",
    "tagline": "Trusted introductions for serious marriage",
    "statusTitle": "Preparing a secure, dependable foundation",
    "statusBody": "This page validates the technical architecture, bilingual routing, and directionality. Waitlist registration is not open in this milestone.",
    "privacyTitle": "Privacy from the start",
    "privacyBody": "This foundation does not collect registrations, photographs, or identity documents.",
    "rtlTitle": "Arabic first",
    "rtlBody": "Correct right-to-left Arabic and English support share one maintainable architecture.",
    "qualityTitle": "Built deliberately",
    "qualityBody": "Testing, accessibility, and an offline-safe shell come before the registration journey.",
    "exampleTitle": "Directionality test card",
    "exampleBody": "Content begins on the right in Arabic and on the left in English, while technical numbers stay readable.",
    "exampleBadge": "Direction verified",
    "examplePhone": "+218 9X XXX XXXX",
    "footer": "Technical foundation only — no matching or messaging features exist in this release."
  },
  "LocaleSwitcher": {
    "label": "عرض النسخة العربية",
    "short": "العربية"
  },
  "Connectivity": {
    "online": "Online",
    "offline": "You are offline",
    "offlineDetail": "The saved interface remains available, but submitting data will require a connection."
  },
  "PwaUpdate": {
    "title": "A new version is ready",
    "body": "Update the interface to use the latest Mithaq foundation.",
    "action": "Update now",
    "dismiss": "Later"
  },
  "Errors": {
    "title": "Something went wrong",
    "body": "No data was lost on this foundation page. Try the action again.",
    "retry": "Try again"
  },
  "Offline": {
    "arabicTitle": "أنت غير متصل الآن",
    "arabicBody": "يمكن عرض الهيكل الأساسي المحفوظ لموقع ميثاق. أعد الاتصال لفتح الصفحات التي تحتاج إلى الشبكة.",
    "englishTitle": "You are offline",
    "englishBody": "The saved Mithaq application shell is available. Reconnect before using any network-dependent page.",
    "retry": "Try again",
    "home": "English home"
  }
}
EOF
cat > src/i18n/locale.ts <<'EOF'
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
  targetLocale: Locale
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
EOF
cat > src/i18n/routing.ts <<'EOF'
import { defineRouting } from "next-intl/routing";
import { locales } from "./locale";

export const routing = defineRouting({
  locales,
  defaultLocale: "ar",
  localePrefix: "always",
  localeDetection: false,
  localeCookie: false,
  alternateLinks: false
});
EOF
cat > src/i18n/navigation.ts <<'EOF'
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
EOF
cat > src/i18n/request.ts <<'EOF'
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: "Africa/Tripoli"
  };
});
EOF
cat > src/global.d.ts <<'EOF'
import type arMessages from "./messages/ar.json";
import type { Locale } from "./i18n/locale";

declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof arMessages;
    TimeZone: "Africa/Tripoli";
  }
}
EOF
cat > src/proxy.ts <<'EOF'
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const handleInternationalization = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Milestone 3 integration point:
  // Refresh the Supabase session here, then preserve both Supabase and
  // next-intl response cookies when composing the two concerns.
  return handleInternationalization(request);
}

export const config = {
  matcher: "/((?!api|serwist|~offline|_next|_vercel|.*\\..*).*)"
};
EOF
cat > src/lib/env-schema.ts <<'EOF'
import { z } from "zod";

export const appEnvironmentValues = [
  "local",
  "preview",
  "staging",
  "production"
] as const;

export const serverEnvironmentShape = {
  APP_ENV: z.enum(appEnvironmentValues)
};

export const clientEnvironmentShape = {
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1)
};

export const environmentSchema = z.object({
  ...serverEnvironmentShape,
  ...clientEnvironmentShape
});
EOF
cat > src/lib/env.ts <<'EOF'
import { createEnv } from "@t3-oss/env-nextjs";
import {
  clientEnvironmentShape,
  serverEnvironmentShape
} from "./env-schema";

export const env = createEnv({
  server: serverEnvironmentShape,
  client: clientEnvironmentShape,
  runtimeEnv: {
    APP_ENV: process.env.APP_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  },
  emptyStringAsUndefined: true
});
EOF
cat > src/lib/utils.ts <<'EOF'
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
EOF
cat > src/lib/fonts.ts <<'EOF'
import { Inter, Noto_Sans_Arabic } from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-noto-arabic",
  display: "swap"
});
EOF
cat > src/lib/supabase/client.ts <<'EOF'
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  browserClient ??= createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  return browserClient;
}
EOF
cat > src/lib/supabase/server.ts <<'EOF'
import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot always write cookies. Milestone 3 will
            // refresh sessions in proxy.ts before authenticated pages render.
          }
        }
      }
    }
  );
}
EOF
