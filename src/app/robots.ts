import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/safety", "/privacy", "/terms"],
        disallow: [
          "/member",
          "/discovery",
          "/introductions",
          "/photos",
          "/settings",
          "/onboarding",
          "/admin",
          "/family-shield",
          "/waitlist",
          "/join",
          "/auth",
          "/account-deletion-requested",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
