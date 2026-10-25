import type { MetadataRoute } from "next";
import { PUBLIC_ORIGIN } from "@/features/support/lib/contact";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/contests", "/support", "/privacy", "/terms"],
      disallow: [
        "/api/",
        "/admin",
        "/settings",
        "/profile",
        "/journal",
        "/practice",
        "/week",
        "/progress",
        "/bookmarks",
        "/reminders",
        "/auth/",
      ],
    },
    sitemap: PUBLIC_ORIGIN + "/sitemap.xml",
  };
}
