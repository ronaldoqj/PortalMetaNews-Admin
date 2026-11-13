import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import styles from "./site.module.css";

/** Newer and older pages of a list, as plain links keeping the list's own query (a search's `q`). */
export function Pagination({ page, total, pageSize, href }: { page: number; total: number; pageSize: number; href: (page: number) => string }) {
  const translate = useTranslations("Site.pagination");
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return <nav className={styles.pager} aria-label={translate("label")}>
    <a className={styles.pagerLink} href={page > 1 ? href(page - 1) : undefined} aria-disabled={page <= 1} rel="prev">
      <ChevronLeft size={16} aria-hidden="true" />{translate("previous")}
    </a>
    <span className={styles.pagerStatus}>{translate("page", { page, pages })}</span>
    <a className={styles.pagerLink} href={page < pages ? href(page + 1) : undefined} aria-disabled={page >= pages} rel="next">
      {translate("next")}<ChevronRight size={16} aria-hidden="true" />
    </a>
  </nav>;
}

/** The heading of a list page: an eyebrow (section, tag, author), the title and what it lists. */
export function PageHeading({ eyebrow, title, description, color, children }: {
  eyebrow?: string; title: string; description?: string; color?: React.CSSProperties; children?: React.ReactNode;
}) {
  return <header className={styles.pageHeading} style={color}>
    {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
    <h1 className={styles.pageTitle}>{title}</h1>
    {description && <p className={styles.pageDescription}>{description}</p>}
    {children}
  </header>;
}
