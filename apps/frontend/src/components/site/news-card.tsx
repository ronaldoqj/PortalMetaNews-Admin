import { Clock } from "lucide-react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import { mediaSources } from "../forms/article-body";
import type { NewsCard } from "./contracts";
import { sectionColor } from "./section-color";
import styles from "./site.module.css";

export type CardVariant = "lead" | "feature" | "compact" | "text";

const SIZES: Record<CardVariant, string> = {
  lead: "(min-width: 62em) 760px, 100vw", feature: "(min-width: 62em) 380px, (min-width: 36em) 50vw, 100vw", compact: "128px", text: "0px",
};

/** When an item was published: relative while recent ("há 3 horas"), the date afterwards. */
export function PublishedTime({ iso }: { iso: string }) {
  const format = useFormatter();
  const now = useNow();
  const date = new Date(iso);
  const recent = now.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
  return <time dateTime={iso}>{recent ? format.relativeTime(date, now) : format.dateTime(date, { day: "numeric", month: "short", year: "numeric" })}</time>;
}

/**
 * One news item as the site lists it: cover (responsive renditions, the image's own colour while it loads, an "IA" mark
 * when generated), section label in its colour, title linking to the article, subtitle and when it was published. The
 * variants are the front page's headline (`lead`: the title over its cover), a highlight (`feature`), a side item with a
 * thumbnail (`compact`) and a plain line (`text`). `subtitle` and `kicker` override what the variant shows: a section's
 * own block leaves out the section label, a dense column the subtitle.
 */
export function NewsCardView({ item, variant = "feature", headingLevel = 3, priority = false, subtitle, kicker = true }: {
  item: NewsCard; variant?: CardVariant; headingLevel?: 2 | 3; priority?: boolean; subtitle?: boolean; kicker?: boolean;
}) {
  const translate = useTranslations("Site");
  const Heading = `h${headingLevel}` as const;
  const href = { pathname: "/site/news/[slug]", params: { slug: item.slug } } as const;
  const sources = item.cover && variant !== "text" ? mediaSources(item.cover.id) : null;
  const showSubtitle = subtitle ?? (variant === "lead" || variant === "feature");
  const label = item.breaking
    ? <span className={`${styles.kicker} ${styles.breakingTag}`}>{translate("breaking")}</span>
    : kicker && item.category && <Link className={styles.kicker} href={{ pathname: "/site/category/[slug]", params: { slug: item.category.slug } }}>{item.category.name}</Link>;
  return <article className={`${styles.card} ${styles[variant] ?? ""}`} style={sectionColor(item.category?.color)}
    data-overlay={variant === "lead" && sources ? "" : undefined}>
    {item.cover && sources && <div className={styles.cardMedia} style={{ backgroundColor: item.cover.color }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- the media library already serves sized WebP renditions (srcset) */}
      <img src={variant === "compact" ? `/media/${item.cover.id}/sm` : sources.src} srcSet={variant === "compact" ? undefined : sources.srcSet}
        sizes={SIZES[variant]} alt={item.cover.alt} width={item.cover.width} height={item.cover.height}
        loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : undefined} decoding="async" />
      {item.cover.source === "ai" && <span className={styles.aiBadge} title={translate("card.aiCoverTitle")}>{translate("card.aiBadge")}</span>}
    </div>}
    <div className={styles.cardBody}>
      {label}
      <Heading className={styles.cardTitle}><Link className={styles.cardLink} href={href}>{item.title}</Link></Heading>
      {showSubtitle && item.subtitle && <p className={styles.cardSubtitle}>{item.subtitle}</p>}
      <div className={styles.meta}>
        <PublishedTime iso={item.publishedAt} />
        {variant !== "compact" && variant !== "text" && <span className={styles.readingTime}>
          <Clock size={12} aria-hidden="true" /><span aria-hidden="true">{translate("card.minutes", { count: item.readingMinutes })}</span>
          <span className={styles.srOnly}>{translate("card.readingTime", { count: item.readingMinutes })}</span>
        </span>}
      </div>
    </div>
  </article>;
}

/** A grid of cards, or what a list without items says; a section's own page leaves out the section label (`kicker`). */
export function NewsGrid({ items, empty, kicker = true }: { items: readonly NewsCard[]; empty: { title: string; hint?: string }; kicker?: boolean }) {
  if (!items.length) return <div className={styles.empty}><strong>{empty.title}</strong>{empty.hint && <span>{empty.hint}</span>}</div>;
  return <div className={`${styles.grid} ${styles.listing}`}>
    {items.map((item, index) => <NewsCardView key={item.id} item={item} priority={index < 3} kicker={kicker} />)}
  </div>;
}
