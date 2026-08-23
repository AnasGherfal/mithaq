import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ميثاق | Mithaq",
    short_name: "ميثاق",
    description: "تعارف جاد ومحترم بغرض الزواج.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8f5ef",
    theme_color: "#153d35",
    lang: "ar",
    dir: "rtl",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
