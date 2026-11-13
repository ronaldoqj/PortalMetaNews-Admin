import { Stack } from "@mantine/core";
import { ArrowLeft, ArrowRight, Clock, FileCode2, List } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { currentActor } from "@/components/admin/api-call";
import { ForbiddenNotice } from "@/components/admin/forbidden-notice";
import { hasPermission } from "@/components/admin/permissions";
import { readCatalog, readDocument, readingMinutes, type DocumentationEntry } from "@/components/documentation/catalog";
import { DocumentContent } from "@/components/documentation/document-content";
import { DocumentToc } from "@/components/documentation/document-toc";
import styles from "@/components/documentation/documentation.module.css";
import { parseMarkdown } from "@/components/documentation/markdown";
import { PageNotFound } from "@/components/shared/page-not-found";
import { Notice } from "@/components/ui";
import { Title } from "@/components/ui/title";
import { Link } from "@/i18n/navigation";

const documentHref = (entry: DocumentationEntry) => ({ pathname: "/panel/documentation/[id]" as const, params: { id: entry.slug } });

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const [translate, actor] = await Promise.all([getTranslations(), currentActor()]);
  // Checked before any file is read.
  if (!actor || !hasPermission(actor, "documentation:read")) return <ForbiddenNotice title={translate("Documentation.title")} />;
  const groups = await readCatalog();
  if (!groups) return <PageNotFound />;
  const { id } = await params;
  const documents = groups.flatMap((group) => group.documents);
  const position = documents.findIndex((entry) => entry.slug === id);
  if (position < 0) return <PageNotFound />;
  const entry = documents[position];
  const text = await readDocument(entry).catch(() => null);
  if (text === null) return <Notice tone="danger">{translate("Documentation.unavailable")}</Notice>;

  const { tree, headings } = parseMarkdown(text);
  const previous = documents[position - 1];
  const next = documents[position + 1];
  const onThisPage = translate("Documentation.onThisPage");
  return <Stack gap="xl">
    <Link href="/panel/documentation" className={styles.backLink}><ArrowLeft size={16} aria-hidden="true" />{translate("Documentation.back")}</Link>
    <header className={styles.documentHeader}>
      <span className={styles.eyebrow}>{groups.find((group) => group.documents.includes(entry))?.title}</span>
      <Title order={1} className={styles.documentTitle}>{entry.title}</Title>
      <p className={styles.documentSummary} style={{ margin: 0 }}>{entry.summary}</p>
      <div className={styles.meta}>
        <span><Clock size={14} aria-hidden="true" />{translate("Documentation.readingTime", { minutes: readingMinutes(entry.words) })}</span>
        <span title={translate("Documentation.source")}><FileCode2 size={14} aria-hidden="true" /><code>{entry.source}</code></span>
      </div>
    </header>
    {headings.length > 1 && <details className={styles.tocMobile}>
      <summary><List size={14} aria-hidden="true" style={{ marginRight: 6, verticalAlign: -2 }} />{onThisPage}</summary>
      <DocumentToc headings={headings} label={onThisPage} />
    </details>}
    <div className={styles.reader}>
      <article>
        <DocumentContent tree={tree} source={entry.source} slugBySource={new Map(documents.map((item) => [item.source, item.slug]))} labels={{
          copy: translate("Documentation.copy"), copied: translate("Documentation.copied"), notPublished: translate("Documentation.notPublished"),
          heading: translate("Documentation.headingLink"), opensInNewTab: translate("Documentation.opensInNewTab"),
          alerts: {
            note: translate("Documentation.alerts.note"), tip: translate("Documentation.alerts.tip"), important: translate("Documentation.alerts.important"),
            warning: translate("Documentation.alerts.warning"), caution: translate("Documentation.alerts.caution"),
          },
        }} />
      </article>
      <aside className={styles.readerAside}><DocumentToc headings={headings} label={onThisPage} /></aside>
    </div>
    {(previous || next) && <nav className={styles.pager} aria-label={translate("Documentation.pagerLabel")}>
      {previous && <Link href={documentHref(previous)} className={styles.pagerLink}>
        <span className={styles.pagerDirection}><ArrowLeft size={12} aria-hidden="true" />{translate("Documentation.previous")}</span>
        <span className={styles.pagerTitle}>{previous.title}</span>
      </Link>}
      {next && <Link href={documentHref(next)} className={styles.pagerLink} data-next="">
        <span className={styles.pagerDirection}>{translate("Documentation.next")}<ArrowRight size={12} aria-hidden="true" /></span>
        <span className={styles.pagerTitle}>{next.title}</span>
      </Link>}
    </nav>}
  </Stack>;
}
