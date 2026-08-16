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
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
