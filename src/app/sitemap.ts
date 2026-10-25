import type { MetadataRoute } from "next";
import { PUBLIC_ORIGIN } from "@/features/support/lib/contact";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/contests", "/support", "/privacy", "/terms"].map((path) => ({
    url: PUBLIC_ORIGIN + path,
    changeFrequency: path === "/contests" ? "daily" : "monthly",
    priority: path === "" ? 1 : path === "/contests" ? 0.9 : 0.3,
  }));
}
