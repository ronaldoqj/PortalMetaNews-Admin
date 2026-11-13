import { siteSitemap } from "@/components/seo/site-index";
import { sitemapXml } from "@/components/seo/xml";

export const dynamic = "force-dynamic";

/** `/sitemap.xml`: every published address of the site with its other languages; empty on the panel's host. */
export async function GET() {
  let entries;
  try {
    entries = await siteSitemap();
  } catch {
    return new Response("Sitemap unavailable", { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return new Response(sitemapXml(entries), {
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=600", "X-Content-Type-Options": "nosniff" },
  });
}
