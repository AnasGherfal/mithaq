import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { inter, notoSansArabic } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "غير متصل | ميثاق",
  robots: {
    index: false,
    follow: false,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0F4D3F",
  colorScheme: "light",
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
