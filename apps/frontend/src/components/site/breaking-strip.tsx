import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";
import type { NewsCard } from "./contracts";
import styles from "./site.module.css";

/** The breaking news of the last two days, in the signal colour, above every page; nothing when there is none. */
export function BreakingStrip({ items }: { items: readonly NewsCard[] }) {
  const translate = useTranslations("Site");
  if (!items.length) return null;
  return <aside className={styles.breaking} aria-label={translate("breaking")}>
    <div className={`${styles.container} ${styles.breakingInner}`}>
      <span className={styles.breakingLabel}>{translate("breaking")}</span>
      <ul className={styles.breakingList}>
        {items.map((item) => <li key={item.id}><Link href={{ pathname: "/site/news/[slug]", params: { slug: item.slug } }}>{item.title}</Link></li>)}
      </ul>
    </div>
  </aside>;
}
