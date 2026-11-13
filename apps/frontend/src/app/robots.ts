import type { MetadataRoute } from "next";
import { siteRobots } from "@/components/seo/site-index";

/** `/robots.txt`: open on the site and pointing to its sitemap, closed on the panel (`components/seo/site-index`). */
export default function robots(): Promise<MetadataRoute.Robots> {
  return siteRobots();
}
