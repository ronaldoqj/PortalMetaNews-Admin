# Public site

The rules of the news site. Guide: [Site público](../site-publico.md). Brand: [Identidade visual](../identidade-visual.md).

## Data

- Pages live under `app/[locale]/(site)/site/` and are server components. They read the public API only through
  `components/site/api.ts` (`backendUrl`, `cache: "no-store"`, an 8-second timeout), and every answer is parsed by the
  strict zod contracts of `components/site/contracts.ts`, which mirror `modules/newsroom/public-news.service.ts` and
  `modules/public/public.controller.ts` exactly. A 404/400 from the API is `null` (the page answers `<PageNotFound />`);
  any other failure or an answer outside its contract throws to the error page. Legal texts use the shared
  `components/site-legal/contracts.ts`.
- The API already filters by language: a page asks for its route locale and never sees an item not published in it.
- Values read from the address are validated before any request: slugs by `slugParameter` (lowercase words joined by
  hyphens, at most 160 characters), page numbers by `pageParameter` (1-500), author ids as UUIDs, the search query
  trimmed to 200 characters (`components/site/params.ts`).
- The identity, logos and menu come from `getRequestBranding()`/`getPublicSite()` (`theme/request-branding.ts`); without
  the API the frame still renders with the bundled identity and no menu. The breaking strip is optional for the same
  reason (`getHome(...).catch(() => null)` in the layout).

## Languages and addresses

- Internal routes and localized addresses are only those of `i18n/routing.ts` (`/site/news/[slug]` →
  `/noticia/[slug]` | `/news/[slug]`, ...). Links use the `Link`/`getPathname` of `i18n/navigation.ts` with the route and
  its params, never a hand-built path.
- The language switch (`components/site/site-header.tsx`) links to `localizedPathname` of the current address, which
  keeps slugs and ids. The article, section and tag pages resolve a slug of the other language themselves: they ask the
  API in the other locale and redirect to `alternates[locale]` (article) or `slugs[locale]` (section, tag); an article
  not published in the target language redirects to that language's home. With the `loading.tsx` boundaries the redirect
  is streamed (`<meta http-equiv="refresh">` plus the client router), which every browser follows.
- `hreflang` uses `pt-BR` and `en` (plus `x-default` on the Portuguese address) in the page metadata and the sitemap.

## SEO

- `components/site/metadata.ts` (`pageMetadata`) is the only builder of page metadata: canonical and languages from the
  page's routes, Open Graph/Twitter with absolute URLs, `article:*` properties, `noIndex` for search results. Absolute
  URLs come from `components/seo/site-url.ts` (the visitor's host, through `x-forwarded-host` behind a proxy, mapped to
  the site's host with `areaUrl` and `SITE_DOMAIN`).
- A shared article uses its cover's `og` rendition (1200x630 JPEG, `/media/<id>/og`); otherwise the portal's `social`
  brand image (panel upload, else `/brand/social.jpg`).
- Structured data is rendered by `JsonLd` (`components/seo/json-ld.tsx`) through `serializeJsonLd`, which escapes `<`,
  `>`, `&`, U+2028 and U+2029, so no text written by the newsroom can close the `<script>`. Articles are
  `NewsArticle`, the home page is `WebSite` with a `SearchAction`.
- `robots.ts` (`siteRobots`): on the site host allow all except the relays (`/<locale>/api/`) and name the sitemap; on the
  panel host and any unknown host, `Disallow: /`. `sitemap.xml/route.ts` and `feed/[locale]/route.ts` answer only on
  the site host; both escape every value with `escapeXml` (`components/seo/xml.ts`), which also drops control
  characters XML forbids. Both are excluded from the proxy by its matcher.

## Privacy

- No third-party script, font, pixel or widget on any page: share buttons are plain links to each network's share URL,
  images come from the frontend's own relays (`/media`, `/brand-assets`, `/authors-avatar`).
- Reads are counted by `ViewBeacon` (one `fetch` POST after mount, `credentials: "omit"`, once per tab via
  `sessionStorage`) to the same-origin relay `app/[locale]/(site)/api/view/[id]/route.ts`, which requires `Origin` to be
  the site itself (`sameOrigin`) and forwards nothing of the request to `POST /public/news/:id/view`. The API keeps a
  count per item and day only.
- The contact form posts through a server action (`components/site/contact-actions.ts`) with the honeypot `website`;
  the message is rich text in the platform grammar (`RichTextInput`), parsed strictly by the API, which also applies the
  shared rate budget. Nothing about the visitor's request is forwarded.

## Presentation

- Styles live in `components/site/site.module.css` and read theme tokens only (`--app-*`, `--app-radius-card`,
  `--mantine-font-family-headings`); a section's colour is its Mantine palette name as `--section-color`
  (`sectionColor`). The theme's layout choices arrive on `<html data-header="left|centered" data-cards="flat|outlined|elevated">`
  and are honoured by the stylesheet only. Text laid over a picture (the headline over its cover) sits on a scrim of
  `--app-ink` in light schemes and `--app-background` in dark ones, so it needs no fixed colour.
- Layout: the front page is the headline (`NewsCardView variant="lead"`, title over the cover when there is one) with the
  highlights, the newest items beside the most read, and one column per front-page section on a full-width band; a
  section column shows first what the top does not (`onTop`), repeating only when it has nothing else. The article is a
  reading column (`--measure`) with a wider cover and the related news as a full-width band. A list page's grid is
  `.grid.listing`: on phones its first card stays large and the others become thumbnail rows.
- Interaction without scripts where possible: the reading progress bar is a CSS scroll-driven animation
  (`@supports (animation-timeline: scroll())`, nothing elsewhere); the header condenses through an
  `IntersectionObserver` on the top bar; the search panel is `inert` while closed and returns focus to its toggle on
  `Escape`. Every animation stops under `prefers-reduced-motion`.
- Cover images are `<img>` with the media library's `sm`/`md`/`lg` WebP renditions as `srcset`, explicit width and
  height and the image's dominant colour as background: `next/image` would re-encode files that are already sized.
- Article bodies render through `ArticleBody` (`components/forms/article-body.tsx`) from the stored grammar, never as
  injected HTML.
- Client components of the site use only the namespaces listed in `CLIENT_NAMESPACES.site` (`i18n/client-messages.ts`);
  the site's copy lives in `messages/<locale>/site.json` (`Site`, `Article`, `Contact`).
- Every folder with a page has a `loading.tsx` (`SitePageSkeleton`); `site/not-found.tsx` answers unknown items inside
  the site's frame.
