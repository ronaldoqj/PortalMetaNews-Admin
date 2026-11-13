import type { Root } from "hast";
import { toJsxRuntime } from "hast-util-to-jsx-runtime";
import { CircleAlert, Info, Lightbulb, MessageSquareWarning, TriangleAlert, type LucideIcon } from "lucide-react";
import { Fragment, type ComponentProps, type ReactNode } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "../../i18n/navigation";
import { CodeBlock } from "./code-block";
import styles from "./documentation.module.css";
import { resolveLink, type AlertKind } from "./markdown";

const ALERT_ICONS: Record<AlertKind, LucideIcon> = { note: Info, tip: Lightbulb, important: MessageSquareWarning, warning: TriangleAlert, caution: CircleAlert };

export type DocumentContentLabels = {
  copy: string; copied: string; notPublished: string; heading: string; opensInNewTab: string; alerts: Record<AlertKind, string>;
};

/**
 * Renders a parsed document as React elements; links to published documents stay in the panel, other repository
 * files stay plain text. A page outside the panel (the site's legal texts) maps its own absolute paths with
 * `siteHref`; any path it does not know stays plain text too.
 */
export function DocumentContent({ tree, source, slugBySource, labels, siteHref }: {
  tree: Root; source: string; slugBySource: ReadonlyMap<string, string>; labels: DocumentContentLabels;
  siteHref?: (path: string) => string | undefined;
}) {
  const heading = (Tag: "h2" | "h3" | "h4") => function DocumentHeading({ id, children, ...props }: ComponentProps<typeof Tag>) {
    return <Tag id={id} {...props}>{children}<a href={`#${id}`} className={styles.headingAnchor} aria-label={labels.heading}>#</a></Tag>;
  };
  const content = toJsxRuntime(tree, {
    Fragment, jsx, jsxs,
    components: {
      a({ href = "", children, ...props }: ComponentProps<"a">) {
        const site = siteHref && href.startsWith("/") ? siteHref(href.split("#", 1)[0]) : undefined;
        if (site) return <a href={site} {...props}>{children}</a>;
        const target = resolveLink(href, source);
        if (target.kind === "anchor") return <a href={target.href} {...props}>{children}</a>;
        if (target.kind === "external") return <a href={target.href} target="_blank" rel="noopener noreferrer" title={labels.opensInNewTab} {...props}>{children}</a>;
        const slug = target.kind === "file" ? slugBySource.get(target.path) : undefined;
        if (target.kind === "file" && slug) {
          return <Link href={{ pathname: "/panel/documentation/[id]", params: { id: slug }, hash: target.hash }}>{children}</Link>;
        }
        return <span className={styles.unpublishedLink} title={labels.notPublished}>{children}</span>;
      },
      // Nothing outside the page is fetched: an image shows its description.
      img: ({ alt }: ComponentProps<"img">) => alt ? <em>{alt}</em> : null,
      table: (props: ComponentProps<"table">) => <div className={styles.tableScroll}><table {...props} /></div>,
      pre: ({ children, "data-code": code = "", "data-language": language }: ComponentProps<"pre"> & { "data-code"?: string; "data-language"?: string }) =>
        <CodeBlock code={code} language={language} labels={{ copy: labels.copy, copied: labels.copied }}>{children}</CodeBlock>,
      blockquote({ children, "data-alert": kind }: ComponentProps<"blockquote"> & { "data-alert"?: AlertKind }): ReactNode {
        if (!kind) return <blockquote>{children}</blockquote>;
        const Icon = ALERT_ICONS[kind];
        return <aside className={styles.alert} data-kind={kind}>
          <div className={styles.alertTitle}><Icon size={16} aria-hidden="true" />{labels.alerts[kind]}</div>
          {children}
        </aside>;
      },
      h2: heading("h2"), h3: heading("h3"), h4: heading("h4"),
    },
  });
  return <div className={styles.prose}>{content}</div>;
}
