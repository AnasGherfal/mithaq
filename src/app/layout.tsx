import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ميثاق | تعارف جاد للزواج",
    template: "%s | ميثاق",
  },
  description:
    "ميثاق مساحة خاصة ومحترمة للتعارف الجاد بغرض الزواج، مصممة لليبيين داخل ليبيا وخارجها.",
  applicationName: "ميثاق",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#153d35",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
