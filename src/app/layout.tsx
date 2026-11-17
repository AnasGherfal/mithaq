import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";

import { siteUrl } from "@/lib/site";

import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  variable: "--font-cairo",
});

const title = "ميثاق | تعارف جاد للزواج";
const description =
  "ميثاق مساحة خاصة ومحترمة للتعارف الجاد بغرض الزواج، مصممة لليبيين داخل ليبيا وخارجها.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s | ميثاق",
  },
  description,
  applicationName: "ميثاق",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    locale: "ar_LY",
    siteName: "ميثاق",
    title,
    description,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "ميثاق" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    title: "ميثاق",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#153d35",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body>{children}</body>
    </html>
  );
}
