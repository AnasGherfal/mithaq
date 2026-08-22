import type { Metadata } from "next";
import type { ReactNode } from "react";
import { inter } from "@/lib/fonts";
import "../globals.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Mithaq Moderation",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function ModerationRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className={`${inter.variable} min-h-svh bg-[#F7F7F5] antialiased`}>
        {children}
      </body>
    </html>
  );
}
