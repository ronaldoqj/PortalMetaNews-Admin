import { CalendarClock, List } from "lucide-react";
import { DocumentContent, type DocumentContentLabels } from "../documentation/document-content";
import { DocumentToc } from "../documentation/document-toc";
import styles from "../documentation/documentation.module.css";
import { parseMarkdown } from "../documentation/markdown";
import { Title } from "../ui/title";

export type LegalReaderLabels = DocumentContentLabels & { onThisPage: string };

/**
 * A legal text read like the panel's documentation: its outline beside the text on wide screens (folded above it on
 * narrow ones) and Markdown rendered as React elements, raw HTML dropped. The site opens it under its page heading,
 * which already carries the title, so `header` is the panel preview's own.
 */
export function LegalReader({ content, labels, updated, header, siteHref }: {
  content: string; labels: LegalReaderLabels;
  /** "Last updated on …", shown under the header; absent for the default text. */
  updated?: string;
  header?: { eyebrow: string; title: string; summary: string };
  siteHref?: (path: string) => string | undefined;
}) {
  const { tree, headings } = parseMarkdown(content);
  return <div className={styles.legal}>
    {header && <header className={styles.documentHeader}>
      <span className={styles.eyebrow}>{header.eyebrow}</span>
      <Title order={1} className={styles.documentTitle}>{header.title}</Title>
      {header.summary && <p className={styles.documentSummary} style={{ margin: 0 }}>{header.summary}</p>}
    </header>}
    {updated && <div className={styles.meta}><span><CalendarClock size={14} aria-hidden="true" />{updated}</span></div>}
    {headings.length > 1 && <details className={styles.tocMobile}>
      <summary><List size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: -2 }} />{labels.onThisPage}</summary>
      <DocumentToc headings={headings} label={labels.onThisPage} />
    </details>}
    <div className={styles.reader}>
      <article><DocumentContent tree={tree} source="" slugBySource={new Map()} labels={labels} siteHref={siteHref} /></article>
      <aside className={styles.readerAside}><DocumentToc headings={headings} label={labels.onThisPage} /></aside>
    </div>
  </div>;
}
