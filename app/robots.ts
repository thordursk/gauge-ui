import type { MetadataRoute } from "next"

import { siteUrl } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The /og page only exists for a headless browser to screenshot.
      disallow: "/og",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
