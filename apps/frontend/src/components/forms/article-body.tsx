import type { ReactNode } from "react";
import { parseArticleHtml, type ArticleBlock, type ArticleInline } from "./article-html";

/** What an image inside a body needs to render: its size, colour while loading, description and credit. */
export type ArticleMedia = { id: string; width: number; height: number; color: string; alt: string; caption: string; credit: string; source: "upload" | "ai" };

const SIZES = { sm: 480, md: 960, lg: 1600 } as const;

/** The responsive sources of a media library image (`/media/<id>/<size>`, served by the frontend's relay). */
export function mediaSources(id: string) {
  return {
    src: `/media/${id}/md`,
    srcSet: (Object.keys(SIZES) as Array<keyof typeof SIZES>).map((size) => `/media/${id}/${size} ${SIZES[size]}w`).join(", "),
  };
}

function inline(node: ArticleInline, key: number): ReactNode {
  switch (node.kind) {
    case "text": return node.text;
    case "br": return <br key={key} />;
    case "a": {
      const external = /^https?:/i.test(node.href);
      return <a key={key} href={node.href} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>{node.children.map(inline)}</a>;
    }
    default: {
      const Tag = node.kind;
      return <Tag key={key}>{node.children.map(inline)}</Tag>;
    }
  }
}

function block(node: ArticleBlock, key: number, media: ReadonlyMap<string, ArticleMedia>, labels: { aiImage: string }): ReactNode {
  switch (node.kind) {
    case "p": case "h2": case "h3": {
      const Tag = node.kind;
      return <Tag key={key}>{node.children.map(inline)}</Tag>;
    }
    case "ul": case "ol": {
      const Tag = node.kind;
      return <Tag key={key}>{node.items.map((item, index) => <li key={index}>{item.map((child, inner) => block(child, inner, media, labels))}</li>)}</Tag>;
    }
    case "blockquote": return <blockquote key={key}>{node.blocks.map((child, index) => block(child, index, media, labels))}</blockquote>;
    case "hr": return <hr key={key} />;
    case "img": {
      const item = media.get(node.mediaId);
      const sources = mediaSources(node.mediaId);
      const caption = [item?.caption, item?.credit && `${item.source === "ai" ? `${labels.aiImage} · ` : ""}${item.credit}`].filter(Boolean).join(" — ");
      return <figure key={key} className="article-figure">
        {/* Responsive renditions with an explicit srcset from the media relay: `next/image` would re-encode them again. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sources.src} srcSet={sources.srcSet} sizes="(min-width: 960px) 760px, 100vw" alt={node.alt || item?.alt || ""} loading="lazy" decoding="async"
          width={item?.width} height={item?.height} style={{ backgroundColor: item?.color }} />
        {caption && <figcaption>{caption}</figcaption>}
      </figure>;
    }
  }
}

/**
 * An article body as React elements, from its stored canonical HTML: nothing is ever injected as markup, and anything
 * outside the grammar renders nothing. Links leaving the site open apart and pass no referrer or ranking.
 */
export function ArticleBody({ html, media = [], labels, className }: {
  html: string; media?: readonly ArticleMedia[]; labels: { aiImage: string }; className?: string;
}) {
  const blocks = parseArticleHtml(html);
  if (!blocks) return null;
  const byId = new Map(media.map((item) => [item.id, item]));
  return <div className={className ?? "article-body"}>{blocks.map((node, index) => block(node, index, byId, labels))}</div>;
}
