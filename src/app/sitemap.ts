import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    { url: `${siteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/safety`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteUrl}/terms`, lastModified, changeFrequency: "monthly", priority: 0.4 },
  ];
}
