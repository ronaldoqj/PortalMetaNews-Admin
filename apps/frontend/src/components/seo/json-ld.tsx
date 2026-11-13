/**
 * Structured data for search engines, rendered as `<script type="application/ld+json">`. The JSON is escaped so no
 * text written by the newsroom (a title with `</script>`) can close the element: `<`, `>`, `&` and the line separators
 * become Unicode escapes, which JSON parsers read back as the same characters.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export interface NewsArticleInput {
  url: string;
  headline: string;
  description: string;
  images: string[];
  publishedAt: string;
  updatedAt: string;
  author: { name: string; url: string } | null;
  publisher: { name: string; logo: string; url: string };
  section: string | null;
  keywords: string[];
  language: string;
}

/** A news article as schema.org `NewsArticle`, the shape Google News and other aggregators read. */
export function newsArticleJsonLd(article: NewsArticleInput) {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": article.url },
    url: article.url,
    headline: article.headline.slice(0, 110),
    description: article.description,
    image: article.images,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: article.language,
    ...(article.section ? { articleSection: article.section } : {}),
    ...(article.keywords.length ? { keywords: article.keywords.join(", ") } : {}),
    author: article.author ? [{ "@type": "Person", name: article.author.name, url: article.author.url }] : [{ "@type": "Organization", name: article.publisher.name, url: article.publisher.url }],
    publisher: { "@type": "NewsMediaOrganization", name: article.publisher.name, url: article.publisher.url, logo: { "@type": "ImageObject", url: article.publisher.logo } },
  };
}

/** The site itself, with its search box, for the home page. */
export function websiteJsonLd(input: { name: string; url: string; searchUrl: string; language: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: input.url,
    inLanguage: input.language,
    potentialAction: { "@type": "SearchAction", target: `${input.searchUrl}?q={search_term_string}`, "query-input": "required name=search_term_string" },
  };
}

/** The element itself; the content is the escaped JSON, never markup. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
